import os
import django
import secrets
import string
import sys
from getpass import getpass

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rapidrescue.settings')
django.setup()

# Now import Django models
from django.contrib.auth.models import User
from django.db import IntegrityError

def generate_password(length=12):
    """
    Generate a strong random password
    """
    alphabet = string.ascii_letters + string.digits + string.punctuation
    password = ''.join(secrets.choice(alphabet) for i in range(length))
    return password

def create_admin_user(username=None, email=None, password=None, interactive=True):
    """
    Create an admin superuser with proper credentials
    """
    if interactive:
        username = input("Admin username (default: admin): ") or "admin"
        email = input("Admin email (default: admin@example.com): ") or "admin@example.com"
        password = getpass("Admin password (leave blank to generate): ")
    
    if not password:
        password = generate_password()
        print(f"\nGenerated strong password: {password}")
        print("Please save this password securely!")
    
    try:
        user = User.objects.create_superuser(
            username=username or "admin",
            email=email or "admin@example.com",
            password=password
        )
        print(f"\nSuperuser '{user.username}' created successfully!")
        return True
    except IntegrityError:
        print(f"\nUser with username '{username}' already exists.")
        if interactive:
            update = input("Do you want to update their password? (y/n): ").lower()
            if update == 'y':
                try:
                    user = User.objects.get(username=username)
                    user.set_password(password)
                    user.is_superuser = True
                    user.is_staff = True
                    user.email = email
                    user.save()
                    print(f"Password updated for '{username}'")
                    return True
                except Exception as e:
                    print(f"Error updating user: {e}")
        return False
    except Exception as e:
        print(f"Error creating superuser: {e}")
        return False

if __name__ == "__main__":
    # Check if we're running non-interactively
    interactive = True
    if len(sys.argv) > 1 and sys.argv[1] == "--non-interactive":
        interactive = False
        username = sys.argv[2] if len(sys.argv) > 2 else "admin"
        email = sys.argv[3] if len(sys.argv) > 3 else "admin@example.com"
        password = sys.argv[4] if len(sys.argv) > 4 else None
        create_admin_user(username, email, password, interactive=False)
    else:
        create_admin_user(interactive=True)
    print("Done. You can now log in to the admin panel with username 'admin' and the specified password.") 