#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys


def main():
    """Run administrative tasks."""
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'rapidrescue.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Couldn't import Django. Are you sure it's installed and "
            "available on your PYTHONPATH environment variable? Did you "
            "forget to activate a virtual environment?"
        ) from exc
    
    # Add custom command to fix driver fields
    if len(sys.argv) > 1 and sys.argv[1] == 'fix_driver_fields':
        fix_driver_fields()
    else:
        execute_from_command_line(sys.argv)


def fix_driver_fields():
    """
    Fix driver fields in the database.
    This ensures all drivers have address and license_no fields.
    """
    print("Fixing driver fields...")
    
    # Import Django models
    from django.core.management import setup_environ
    import settings
    setup_environ(settings)
    
    from api.models import Driver
    
    # Get all drivers
    drivers = Driver.objects.all()
    print(f"Found {len(drivers)} drivers in the database.")
    
    # Count of drivers with missing fields
    missing_address = 0
    missing_license = 0
    
    # Fix each driver
    for driver in drivers:
        updated = False
        
        # Check for missing address
        if not driver.address:
            driver.address = f"Address for {driver.name}"
            missing_address += 1
            updated = True
            
        # Check for missing license_no
        if not driver.license_no:
            driver.license_no = f"LIC-{driver.id:04d}"
            missing_license += 1
            updated = True
            
        # Save if updated
        if updated:
            driver.save()
            print(f"Updated driver: {driver.name} (ID: {driver.id})")
    
    print(f"\nSummary:")
    print(f"- {missing_address} drivers had missing address fields")
    print(f"- {missing_license} drivers had missing license_no fields")
    print(f"- {missing_address + missing_license} total fields were updated")
    
    if missing_address == 0 and missing_license == 0:
        print("\nAll drivers have the required fields. No updates were needed.")
    else:
        print("\nAll drivers now have the required fields.")


if __name__ == '__main__':
    main()
