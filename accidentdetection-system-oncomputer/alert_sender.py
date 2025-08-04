import requests
import json
import random
from datetime import datetime
import string
import os
import numpy as np
import base64

class AlertSender:
    def __init__(self, api_url="http://localhost:8000"):
        self.api_url = api_url
        self.alert_sent = False
        self.last_alert_time = None
        self.cooldown_period = 120  # Increased to 2 minutes between alerts
        self.max_video_size = 10 * 1024 * 1024  # 10MB limit
        
        # Permanent token generated for admin user
        self.demo_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzUyMDY5MDU3LCJpYXQiOjE3NDk0NzcwNTcsImp0aSI6IjlhNjZmNDFlZjU2ZTQ4OTFiYmUzNGRhMTc2MmQ2NWZiIiwidXNlcl9pZCI6MjMsImlzX3N0YWZmIjp0cnVlLCJpc19zdXBlcnVzZXIiOnRydWUsInVzZXJuYW1lIjoiYWRtaW4ifQ.lK0FCBT6It5aL1HUWsEQoDlYTlwTtINNj5Pt9T3uQyw"
        
        print(f"AlertSender initialized with API URL: {self.api_url}")
        
    def _generate_alert_id(self):
        """Generate a unique alert ID"""
        timestamp = datetime.now().strftime("%d%m%y")
        random_digits = ''.join(random.choices(string.digits, k=3))
        return f"A{timestamp}{random_digits}"
        
    def _get_random_lahore_coordinates(self):
        """Generate random coordinates within Lahore city bounds"""
        # Approximate Lahore bounds
        LAT_MIN, LAT_MAX = 31.4, 31.6
        LNG_MIN, LNG_MAX = 74.2, 74.4
        
        return {
            'lat': random.uniform(LAT_MIN, LAT_MAX),
            'lng': random.uniform(LNG_MIN, LNG_MAX)
        }
    
    def _convert_to_serializable(self, value):
        """Convert NumPy types to native Python types"""
        if isinstance(value, np.floating):
            return float(value)
        elif isinstance(value, np.integer):
            return int(value)
        elif isinstance(value, np.ndarray):
            return value.tolist()
        return value
        
    def _encode_video(self, video_path):
        """Encode video file to base64 with size check"""
        try:
            # Check file size
            file_size = os.path.getsize(video_path)
            if file_size > self.max_video_size:
                print(f"Warning: Video file too large ({file_size/1024/1024:.1f}MB). Maximum size is {self.max_video_size/1024/1024}MB")
                return None
                
            with open(video_path, 'rb') as video_file:
                video_data = video_file.read()
                base64_video = base64.b64encode(video_data).decode('utf-8')
                return base64_video
        except Exception as e:
            print(f"Error encoding video: {e}")
            return None

    def _generate_video_url(self, video_path, alert_id):
        """Generate a URL for the video file"""
        try:
            # Get the filename from the path
            filename = os.path.basename(video_path)
            # Create a URL-friendly version of the filename
            safe_filename = f"accident_{alert_id}_{filename}"
            # Generate the URL using the correct media URL
            return f"{self.api_url}/media/accident_clips/{safe_filename}"
        except Exception as e:
            print(f"Error generating video URL: {e}")
            return None
        
    def send_accident_alert(self, confidence_score, video_path=None, frame_timestamp=None):
        """
        Send an accident alert to the backend server.
        
        Args:
            confidence_score (float): The confidence score of the accident detection
            video_path (str, optional): Path to the video file to upload
            frame_timestamp (str, optional): Timestamp of the frame where accident was detected
        """
        try:
            # Get current time
            current_time = datetime.now()
            
            # Check if we should send a new alert
            if self.alert_sent and self.last_alert_time:
                time_diff = (current_time - self.last_alert_time).total_seconds()
                if time_diff < self.cooldown_period:
                    print(f"\n⏳ Waiting for alert cooldown ({int(self.cooldown_period - time_diff)}s remaining)")
                    return False
            
            try:
                # Generate alert data
                coordinates = self._get_random_lahore_coordinates()
                current_time_str = current_time.strftime("%H:%M:%S")
                current_date_str = current_time.strftime("%Y-%m-%d")
                alert_id = self._generate_alert_id()
                
                # Convert confidence score to native Python float
                confidence_score = self._convert_to_serializable(confidence_score)
                
                # Prepare the alert data
                alert_data = {
                    "alert_id": alert_id,
                    "time": current_time_str,
                    "date": current_date_str,
                    "location": "Emergency Location",
                    "status": "pending",
                    "coordinates_lat": coordinates['lat'],
                    "coordinates_lng": coordinates['lng'],
                    "priority": "high",
                    "type": "Accident Emergency",
                    "confidence_score": confidence_score
                }
                
                # Add video data if provided
                if video_path and os.path.exists(video_path):
                    print(f"Encoding video file: {video_path}")
                    video_size = os.path.getsize(video_path)
                    print(f"Video file size: {video_size/1024/1024:.1f}MB")
                    
                    if video_size <= self.max_video_size:
                        try:
                            files = {
                                'accident_clip': (
                                    os.path.basename(video_path),
                                    open(video_path, 'rb'),
                                    'video/mp4'  # Use standard MP4 MIME type
                                )
                            }
                            
                            # Send POST request to backend with demo token
                            response = requests.post(
                                f"{self.api_url}/api/alerts/",
                                data=alert_data,
                                files=files,
                                headers={
                                    "Authorization": f"Bearer {self.demo_token}"
                                },
                                timeout=30  # Add timeout
                            )
                            
                            # Always close the file
                            files['accident_clip'][1].close()
                            
                            print(f"\nResponse status code: {response.status_code}")
                            print(f"Response headers: {dict(response.headers)}")
                            
                            try:
                                response_data = response.json()
                                print("\nResponse data details:")
                                print(json.dumps(response_data, indent=2))
                                
                                if response.status_code in [200, 201]:
                                    print(f"\n✅ Alert sent successfully!")
                                    print(f"Alert ID: {alert_id}")
                                    print(f"Location coordinates: {coordinates}")
                                    print(f"Video uploaded: {video_path}")
                                    print(f"Check the ambulance dashboard at http://localhost:3000/admin/dashboard")
                                    self.alert_sent = True
                                    self.last_alert_time = current_time
                                    return True
                                else:
                                    error_msg = response_data.get('error', response.text)
                                    print(f"\n❌ Failed to send alert. Status code: {response.status_code}")
                                    print(f"Error: {error_msg}")
                                    return False
                                    
                            except json.JSONDecodeError:
                                print(f"\n❌ Error: Invalid JSON response")
                                print(f"Raw response: {response.text}")
                                return False
                                
                        except requests.exceptions.Timeout:
                            print("\n❌ Request timed out. The server took too long to respond.")
                            return False
                        except requests.exceptions.RequestException as e:
                            print(f"\n❌ Request error: {str(e)}")
                            return False
                        except Exception as e:
                            print(f"\n❌ Unexpected error: {str(e)}")
                            import traceback
                            print(traceback.format_exc())
                            return False
                        finally:
                            # Ensure file is closed even if an error occurs
                            if 'files' in locals() and 'accident_clip' in files:
                                try:
                                    files['accident_clip'][1].close()
                                except:
                                    pass
                    else:
                        print(f"Video file too large ({video_size/1024/1024:.1f}MB). Maximum size is {self.max_video_size/1024/1024}MB")
                        return False
                else:
                    # If no video, send alert without video data
                    try:
                        response = requests.post(
                            f"{self.api_url}/api/alerts/",
                            data=alert_data,
                            headers={
                                "Authorization": f"Bearer {self.demo_token}"
                            },
                            timeout=30
                        )
                        
                        print(f"\nResponse status code: {response.status_code}")
                        print(f"Response headers: {dict(response.headers)}")
                        
                        try:
                            response_data = response.json()
                            print("\nResponse data details:")
                            print(json.dumps(response_data, indent=2))
                            
                            if response.status_code in [200, 201]:
                                print(f"\n✅ Alert sent successfully!")
                                print(f"Alert ID: {alert_id}")
                                print(f"Location coordinates: {coordinates}")
                                print(f"Check the ambulance dashboard at http://localhost:3000/admin/dashboard")
                                self.alert_sent = True
                                self.last_alert_time = current_time
                                return True
                            else:
                                error_msg = response_data.get('error', response.text)
                                print(f"\n❌ Failed to send alert. Status code: {response.status_code}")
                                print(f"Error: {error_msg}")
                                return False
                                
                        except json.JSONDecodeError:
                            print(f"\n❌ Error: Invalid JSON response")
                            print(f"Raw response: {response.text}")
                            return False
                            
                    except requests.exceptions.Timeout:
                        print("\n❌ Request timed out. The server took too long to respond.")
                        return False
                    except requests.exceptions.RequestException as e:
                        print(f"\n❌ Request error: {str(e)}")
                        return False
                    except Exception as e:
                        print(f"\n❌ Unexpected error: {str(e)}")
                        import traceback
                        print(traceback.format_exc())
                        return False
                    
            except requests.exceptions.ConnectionError:
                print("\n❌ Connection error: Could not connect to the backend server")
                print("Make sure the Django backend is running at", self.api_url)
                return False
            except Exception as e:
                print(f"\n❌ Error sending alert: {str(e)}")
                import traceback
                print(traceback.format_exc())
                return False
                
        except requests.exceptions.ConnectionError:
            print("\n❌ Connection error: Could not connect to the backend server")
            print("Make sure the Django backend is running at", self.api_url)
            return False
        except Exception as e:
            print(f"\n❌ Error sending alert: {str(e)}")
            import traceback
            print(traceback.format_exc())
            return False
            
    def reset(self):
        """Reset the alert sent flag"""
        print("Resetting alert sender - ready to send new alerts")
        self.alert_sent = False 