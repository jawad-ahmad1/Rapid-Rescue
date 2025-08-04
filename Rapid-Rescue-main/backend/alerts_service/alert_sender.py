import requests
import json
import random
import datetime
import string
import os
import numpy as np
import base64

class AlertSender:
    def __init__(self, api_url="http://localhost:8000"):
        self.api_url = api_url
        self.alert_sent = False
        self.last_alert_time = None
        self.cooldown_period = 60  # Minimum seconds between alerts
        
        # Permanent token generated for admin user
        self.demo_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzUyMDY5MDU3LCJpYXQiOjE3NDk0NzcwNTcsImp0aSI6IjlhNjZmNDFlZjU2ZTQ4OTFiYmUzNGRhMTc2MmQ2NWZiIiwidXNlcl9pZCI6MjMsImlzX3N0YWZmIjp0cnVlLCJpc19zdXBlcnVzZXIiOnRydWUsInVzZXJuYW1lIjoiYWRtaW4ifQ.lK0FCBT6It5aL1HUWsEQoDlYTlwTtINNj5Pt9T3uQyw"
        
        print(f"AlertSender initialized with API URL: {self.api_url}")
        
    def _generate_alert_id(self):
        """Generate a unique alert ID"""
        timestamp = datetime.datetime.now().strftime("%d%m%y")
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
        """Encode video file to base64"""
        try:
            with open(video_path, 'rb') as video_file:
                video_data = video_file.read()
                base64_video = base64.b64encode(video_data).decode('utf-8')
                return base64_video
        except Exception as e:
            print(f"Error encoding video: {e}")
            return None

    def _generate_video_url(self, video_path, alert_id):
        """Generate a URL for the video file"""
        # Get the filename from the path
        filename = os.path.basename(video_path)
        # Create a URL-friendly version of the filename
        safe_filename = f"accident_{alert_id}_{filename}"
        # Generate the URL
        return f"http://localhost:8001/media/accident_clips/{safe_filename}"
        
    def send_accident_alert(self, confidence_score, video_path=None, frame_timestamp=None):
        """
        Send an alert to the backend if an accident is detected and cooldown period has passed
        Returns True if alert was sent, False otherwise
        
        Parameters:
        - confidence_score: float, the model's confidence in the accident detection
        - video_path: str, optional path to the video file of the accident
        - frame_timestamp: datetime, optional timestamp of when the accident was detected
        """
        current_time = datetime.datetime.now()
        
        # Check if we've already sent an alert or if we're in cooldown period
        if self.alert_sent:
            print("Alert already sent, waiting for reset")
            return False
            
        if self.last_alert_time and (current_time - self.last_alert_time).total_seconds() < self.cooldown_period:
            print(f"In cooldown period. Please wait {self.cooldown_period - (current_time - self.last_alert_time).total_seconds():.0f} seconds")
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
                print(f"Video file size: {video_size} bytes")
                
                # Get video filename and encode video data
                video_filename = os.path.basename(video_path)
                base64_video = self._encode_video(video_path)
                
                if base64_video:
                    # Generate video URL
                    video_url = self._generate_video_url(video_path, alert_id)
                    
                    # Add video data to alert
                    alert_data.update({
                        "accident_clip_name": video_filename,
                        "accident_clip_data": base64_video,
                        "accident_clip_type": "video/x-msvideo",
                        "video_url": video_url  # Add the video URL
                    })
                    print("Video data encoded and added to alert")
                else:
                    print("Failed to encode video data")
            
            print(f"\nSending alert to {self.api_url}/api/alerts/")
            print(f"Alert data: {json.dumps({**alert_data, 'accident_clip_data': '...' if 'accident_clip_data' in alert_data else None}, indent=2)}")
            
            # Send POST request to backend with demo token
            response = requests.post(
                f"{self.api_url}/api/alerts/",
                json=alert_data,  # Send as JSON instead of form data
                headers={
                    "Authorization": f"Bearer {self.demo_token}",
                    "Content-Type": "application/json"
                }
            )
            
            print(f"\nResponse status code: {response.status_code}")
            print(f"Response headers: {dict(response.headers)}")
            
            try:
                response_data = response.json()
                print("\nResponse data details:")
                print(json.dumps(response_data, indent=2))
                
                # Check if alert was created successfully
                if response.status_code in [200, 201]:
                    print(f"\n✅ Alert sent successfully!")
                    print(f"Alert ID: {alert_id}")
                    print(f"Location coordinates: {coordinates}")
                    if video_path:
                        print(f"Video uploaded: {video_path}")
                        print(f"Video URL: {alert_data.get('video_url')}")
                    print(f"Check the ambulance dashboard at http://localhost:3000/admin/dashboard")
                    self.alert_sent = True
                    self.last_alert_time = current_time
                    return True
                else:
                    print(f"\n❌ Failed to send alert. Status code: {response.status_code}")
                    print(f"Error: {response.text}")
                    return False
                    
            except Exception as e:
                print(f"Error parsing response: {str(e)}")
                print(f"Raw response text: {response.text}")
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