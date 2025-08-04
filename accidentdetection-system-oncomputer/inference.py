import cv2
import numpy as np
import onnxruntime
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
from collections import deque
import json
from alert_sender import AlertSender
import os
from datetime import datetime, timedelta
import jwt
from functools import wraps
import secrets

# Token configuration
JWT_SECRET_KEY = "pakistan123_super_secret_key_for_admin_access"  # Fixed secret key

# Create a permanent token without expiration
PERMANENT_ADMIN_TOKEN = jwt.encode(
    {
        'user_id': 'admin',
        'is_superuser': True,
        'created_by': 'Admin',
        'type': 'permanent_access'
    },
    JWT_SECRET_KEY,
    algorithm='HS256'
)

def validate_token(token):
    """Validate the provided token"""
    try:
        # Decode without verifying expiration
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=['HS256'], options={"verify_exp": False})
        return payload.get('is_superuser', False) and payload.get('type') == 'permanent_access'
    except jwt.InvalidTokenError:
        return False

def require_token(func):
    """Decorator to require token validation before executing a function"""
    @wraps(func)
    def wrapper(*args, **kwargs):
        # Always use the permanent token
        os.environ['INFERENCE_TOKEN'] = PERMANENT_ADMIN_TOKEN
        if not validate_token(PERMANENT_ADMIN_TOKEN):
            raise ValueError("Invalid token")
        return func(*args, **kwargs)
    return wrapper

# Set the permanent token in environment variable
os.environ['INFERENCE_TOKEN'] = PERMANENT_ADMIN_TOKEN

# Performance optimizations
CUDA_AVAILABLE = 'CUDAExecutionProvider' in onnxruntime.get_available_providers()
NUM_THREADS = 4  # Reduced for better stability
BATCH_SIZE = 30  # Smaller batches for better memory management

# Initialize alert sender
alert_sender = AlertSender()

# Directory for saving accident clips
ACCIDENT_CLIPS_DIR = "../Rapid-Rescue/backend/media/accident_clips"
if not os.path.exists(ACCIDENT_CLIPS_DIR):
    os.makedirs(ACCIDENT_CLIPS_DIR)

class OptimizedFrameProcessor:
    def __init__(self, model_path, enable_optimization=True):
        # Validate token before initialization
        token = os.getenv('INFERENCE_TOKEN')
        if not token or not validate_token(token):
            raise ValueError("Valid token required for model initialization")
            
        # Optimized provider configuration
        providers = []
        if CUDA_AVAILABLE:
            providers.append(('CUDAExecutionProvider', {
                'device_id': 0,
                'arena_extend_strategy': 'kSameAsRequested',
                'gpu_mem_limit': 2 * 1024 * 1024 * 1024,  # 2GB limit
                'cudnn_conv_algo_search': 'EXHAUSTIVE',
            }))
        providers.append('CPUExecutionProvider')
        
        # Session options for optimization
        sess_options = onnxruntime.SessionOptions()
        if enable_optimization:
            sess_options.enable_cpu_mem_arena = False
            sess_options.enable_mem_pattern = False
            sess_options.enable_mem_reuse = False
            sess_options.graph_optimization_level = onnxruntime.GraphOptimizationLevel.ORT_ENABLE_ALL
            sess_options.intra_op_num_threads = 2  # Reduced for stability
            sess_options.inter_op_num_threads = 1
        
        self.session = onnxruntime.InferenceSession(model_path, sess_options, providers=providers)
        self.input_name = self.session.get_inputs()[0].name
        
        # Get input shape
        input_shape = self.session.get_inputs()[0].shape
        self.input_height = input_shape[2] if len(input_shape) > 2 else 640
        self.input_width = input_shape[3] if len(input_shape) > 3 else 640
        
        # Thread-local storage for canvas to avoid conflicts
        self.local = threading.local()
        
        print(f"Model input size: {self.input_width}x{self.input_height}")
        print(f"Using providers: {[provider[0] if isinstance(provider, tuple) else provider for provider in providers]}")

    def get_canvas(self):
        """Get thread-local canvas"""
        if not hasattr(self.local, 'canvas'):
            self.local.canvas = np.full((self.input_height, self.input_width, 3), 114, dtype=np.uint8)
        return self.local.canvas

    def preprocess_image_optimized(self, img):
        """Optimized preprocessing with thread-local arrays"""
        h, w = img.shape[:2]
        
        # Calculate scale and padding
        scale = min(self.input_width/w, self.input_height/h)
        new_w = int(w * scale)
        new_h = int(h * scale)
        
        # Resize image
        resized = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
        
        # Get thread-local canvas
        canvas = self.get_canvas()
        canvas.fill(114)
        
        # Center the image
        offset_x = (self.input_width - new_w) // 2
        offset_y = (self.input_height - new_h) // 2
        canvas[offset_y:offset_y+new_h, offset_x:offset_x+new_w] = resized
        
        # Normalize and transpose
        preprocessed = canvas.astype(np.float32) / 255.0
        preprocessed = preprocessed.transpose(2, 0, 1)
        preprocessed = np.expand_dims(preprocessed, axis=0)
        
        return preprocessed, (scale, offset_x, offset_y)

    def smart_postprocess(self, output, original_size, preprocess_params, 
                         adaptive_threshold=True, frame_number=0):
        """
        Improved postprocessing with adaptive thresholding and better filtering
        """
        try:
            predictions = output[0].squeeze() if isinstance(output, list) else output.squeeze()
            
            if len(predictions.shape) == 1:
                return [], [], [], 0.3
            
            if predictions.shape[0] < predictions.shape[1]:
                predictions = predictions.T
            
            # Extract predictions
            boxes = predictions[:, :4]  # x, y, w, h
            confidence_scores = predictions[:, 4]  # objectness confidence
            
            # Adaptive confidence threshold based on score distribution
            if adaptive_threshold and len(confidence_scores) > 0:
                # Use percentile-based thresholding for better results
                score_90th = np.percentile(confidence_scores, 90)
                score_95th = np.percentile(confidence_scores, 95)
                
                # Dynamic threshold: higher when high-confidence detections exist
                if score_95th > 0.7:
                    conf_threshold = max(0.5, score_90th * 0.8)
                elif score_90th > 0.4:
                    conf_threshold = max(0.35, score_90th * 0.7)
                else:
                    conf_threshold = 0.25  # Fallback for low-confidence frames
            else:
                conf_threshold = 0.3
            
            # Apply confidence filtering
            conf_mask = confidence_scores >= conf_threshold
            boxes = boxes[conf_mask]
            scores = confidence_scores[conf_mask]
            
            if len(boxes) == 0:
                return [], [], [], conf_threshold
            
            # Convert to corner format
            x_center, y_center, width, height = boxes.T
            x1 = x_center - width / 2
            y1 = y_center - height / 2
            x2 = x_center + width / 2
            y2 = y_center + height / 2
            boxes = np.stack([x1, y1, x2, y2], axis=1)
            
            # Scale back to original coordinates
            scale, offset_x, offset_y = preprocess_params
            boxes[:, [0, 2]] -= offset_x
            boxes[:, [1, 3]] -= offset_y
            boxes = boxes / scale
            
            # Clip to image boundaries
            orig_h, orig_w = original_size
            boxes[:, [0, 2]] = np.clip(boxes[:, [0, 2]], 0, orig_w)
            boxes[:, [1, 3]] = np.clip(boxes[:, [1, 3]], 0, orig_h)
            
            # Filter out tiny boxes (likely false positives)
            box_areas = (boxes[:, 2] - boxes[:, 0]) * (boxes[:, 3] - boxes[:, 1])
            min_area = (orig_w * orig_h) * 0.001  # At least 0.1% of image area
            area_mask = box_areas > min_area
            
            boxes = boxes[area_mask]
            scores = scores[area_mask]
            
            if len(boxes) == 0:
                return [], [], [], conf_threshold
            
            # Adaptive NMS threshold
            if len(boxes) > 10:
                nms_threshold = 0.3  # Stricter when many detections
            elif len(boxes) > 5:
                nms_threshold = 0.4
            else:
                nms_threshold = 0.5  # More lenient when few detections
            
            # Apply NMS
            indices = cv2.dnn.NMSBoxes(
                boxes.tolist(), 
                scores.tolist(), 
                conf_threshold, 
                nms_threshold
            )
            
            if len(indices) > 0:
                if isinstance(indices, np.ndarray):
                    indices = indices.flatten()
                
                final_boxes = boxes[indices].astype(np.int32)
                final_scores = scores[indices]
                class_ids = np.zeros(len(final_scores), dtype=int)  # Single class
                
                return final_boxes, final_scores, class_ids, conf_threshold
            
            return [], [], [], conf_threshold
            
        except Exception as e:
            print(f"Error in postprocessing: {e}")
            return [], [], [], 0.3

    @require_token
    def process_frame(self, frame, frame_number=0):
        try:
            preprocessed, preprocess_params = self.preprocess_image_optimized(frame)
            outputs = self.session.run(None, {self.input_name: preprocessed})
            boxes, scores, class_ids, threshold_used = self.smart_postprocess(
                outputs, frame.shape[:2], preprocess_params, frame_number=frame_number
            )
            return boxes, scores, class_ids, threshold_used
        except Exception as e:
            print(f"Error processing frame {frame_number}: {e}")
            return [], [], [], 0.3

class TemporalSmoothing:
    def __init__(self, window_size=5, confidence_boost=0.1):
        self.window_size = window_size
        self.confidence_boost = confidence_boost
        self.detection_history = []
        self.score_history = []
        
    def update(self, scores):
        """Update the score history and return smoothed scores"""
        # Convert scores to numpy array if it isn't already
        scores = np.array(scores, dtype=np.float32)
        
        # Store scores in history
        self.score_history.append(scores)
        if len(self.score_history) > self.window_size:
            self.score_history.pop(0)
            
        # Calculate smoothed scores
        if len(self.score_history) > 0:
            # Ensure all arrays in history have the same shape
            max_len = max(s.shape[0] for s in self.score_history)
            padded_scores = []
            
            for s in self.score_history:
                if s.shape[0] < max_len:
                    # Pad with zeros if necessary
                    padded = np.zeros(max_len, dtype=np.float32)
                    padded[:s.shape[0]] = s
                    padded_scores.append(padded)
                else:
                    padded_scores.append(s)
            
            # Stack arrays and calculate mean
            stacked_scores = np.stack(padded_scores)
            smoothed_scores = np.mean(stacked_scores, axis=0)
            
            # Apply confidence boost
            smoothed_scores = np.clip(smoothed_scores + self.confidence_boost, 0, 1)
            
            # Return only the relevant portion of smoothed scores
            return smoothed_scores[:scores.shape[0]]
        return scores

    def add_frame_detections(self, boxes, scores, class_ids):
        """Add frame detections to history"""
        self.detection_history.append((boxes, scores, class_ids))
        if len(self.detection_history) > self.window_size:
            self.detection_history.pop(0)

    def get_smoothed_detections(self):
        """Get smoothed detections based on history"""
        if not self.detection_history:
            return None, None, None
            
        # Get the most recent detections
        boxes, scores, class_ids = self.detection_history[-1]
        
        # Apply temporal smoothing to scores
        smoothed_scores = self.update(scores)
        
        return boxes, smoothed_scores, class_ids

def draw_enhanced_detection(frame, boxes, scores, class_ids, threshold_used):
    """Enhanced visualization with more information"""
    output = frame.copy()
    
    # Color coding based on confidence
    for box, score, class_id in zip(boxes, scores, class_ids):
        x1, y1, x2, y2 = map(int, box)
        
        # Color based on confidence: Red (low) -> Yellow (medium) -> Green (high)
        if score > 0.7:
            color = (0, 255, 0)  # Green - high confidence
        elif score > 0.5:
            color = (0, 255, 255)  # Yellow - medium confidence
        else:
            color = (0, 165, 255)  # Orange - lower confidence
        
        # Thickness based on confidence
        thickness = 2 if score > 0.6 else 1
        
        # Draw bounding box
        cv2.rectangle(output, (x1, y1), (x2, y2), color, thickness)
        
        # Enhanced label with more info
        label = f'ACCIDENT {score:.2f}'
        
        # Get text size
        (label_w, label_h), baseline = cv2.getTextSize(
            label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2
        )
        
        # Draw label background
        cv2.rectangle(
            output, 
            (x1, y1 - label_h - 8), 
            (x1 + label_w + 4, y1), 
            color, 
            -1
        )
        
        # Draw label text
        cv2.putText(
            output, 
            label, 
            (x1 + 2, y1 - 4), 
            cv2.FONT_HERSHEY_SIMPLEX, 
            0.5, 
            (0, 0, 0), 
            2
        )
    
    # Add frame info
    info_text = f'Detections: {len(boxes)} | Threshold: {threshold_used:.2f}'
    cv2.putText(output, info_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
    
    return output

@require_token
def process_single_frame(processor, frame, frame_number, temporal_smoother=None, video_writer=None, accident_frames=None):
    """Process a single frame and return detection results"""
    try:
        # Process frame
        results = processor.process_frame(frame, frame_number)
        
        # Get detection results
        boxes = results[0]
        scores = results[1]
        class_ids = results[2]
        threshold_used = results[3]
        
        # Apply temporal smoothing if enabled
        if temporal_smoother is not None:
            scores = temporal_smoother.update(scores)
        
        # Check if any detection exceeds threshold
        if np.any(scores > threshold_used):
            # If we're collecting accident frames, add this frame
            if accident_frames is not None:
                accident_frames.append(frame.copy())  # Use copy to prevent reference issues
                
                # If we have enough frames, save the video and send alert
                if len(accident_frames) >= 30:  # 1 second at 30fps
                    try:
                        # Generate video filename
                        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                        video_path = os.path.join(ACCIDENT_CLIPS_DIR, f"accident_{timestamp}.mp4")
                        
                        # Save video clip with H.264 codec
                        height, width = frame.shape[:2]
                        
                        # Use platform-specific codec
                        if os.name == 'nt':  # Windows
                            fourcc = cv2.VideoWriter_fourcc(*'H264')  # or 'avc1'
                        else:  # Linux/Mac
                            fourcc = cv2.VideoWriter_fourcc(*'avc1')
                            
                        temp_video_writer = cv2.VideoWriter(
                            video_path,
                            fourcc,
                            30.0, (width, height)
                        )
                        
                        # Write frames to video
                        for f in accident_frames:
                            temp_video_writer.write(f)
                        temp_video_writer.release()
                        
                        print(f"\nSaved video clip to: {video_path}")
                        
                        # Send alert with video
                        alert_sender.send_accident_alert(np.max(scores), video_path=video_path)
                        
                    except Exception as e:
                        print(f"Error saving video clip: {str(e)}")
                        import traceback
                        print(traceback.format_exc())
                    finally:
                        # Clear frames buffer regardless of success/failure
                        accident_frames.clear()
        
        return boxes, scores, class_ids, threshold_used
        
    except Exception as e:
        print(f"Error processing frame: {str(e)}")
        import traceback
        print(traceback.format_exc())
        return None, None, None, None

@require_token
def main():
    # Initialize video capture
    cap = cv2.VideoCapture('c_4.mp4')  # or 0 for webcam
    if not cap.isOpened():
        print("Error: Could not open video file")
        return

    # Initialize frame processor
    processor = OptimizedFrameProcessor('best.onnx')
    temporal_smoother = TemporalSmoothing()
    
    frame_count = 0
    processing_times = deque(maxlen=30)
    accident_frames = deque(maxlen=30)  # Buffer for accident frames
    
    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break
                
            start_time = time.time()
            
            # Process frame and get detections
            boxes, scores, class_ids, threshold = process_single_frame(
                processor, frame, frame_count, temporal_smoother,
                accident_frames=accident_frames
            )
            
            # Draw detections on frame
            annotated_frame = draw_enhanced_detection(
                frame.copy(), boxes, scores, class_ids, threshold
            )
            
            # Calculate and display FPS
            processing_time = time.time() - start_time
            processing_times.append(processing_time)
            avg_fps = 1.0 / (sum(processing_times) / len(processing_times))
            
            cv2.putText(
                annotated_frame,
                f'FPS: {avg_fps:.1f}',
                (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX,
                1.0,
                (0, 255, 0),
                2
            )
            
            # Display frame
            cv2.imshow('Accident Detection', annotated_frame)
            
            frame_count += 1
            
            # Break on 'q' press
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
            
    except KeyboardInterrupt:
        print("Interrupted by user")
    except Exception as e:
        print(f"Error in main loop: {e}")
    finally:
        cap.release()
        cv2.destroyAllWindows()

if __name__ == "__main__":
    main()