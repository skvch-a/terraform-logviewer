#!/usr/bin/env python3
"""
Simple test script for the gRPC plugin system.

This script demonstrates how to:
1. Start the error aggregator plugin
2. Register it with the backend
3. Process logs through the plugin
4. View results
"""

import subprocess
import time
import requests
import sys
import signal
import os

# Configuration
BACKEND_URL = "http://localhost:8000/api"
PLUGIN_PORT = 50051
PLUGIN_ADDRESS = f"localhost:{PLUGIN_PORT}"

plugin_process = None


def cleanup(signum=None, frame=None):
    """Clean up plugin process on exit."""
    global plugin_process
    if plugin_process:
        print("\n🛑 Stopping plugin server...")
        plugin_process.terminate()
        plugin_process.wait()
    sys.exit(0)


# Register signal handlers
signal.signal(signal.SIGINT, cleanup)
signal.signal(signal.SIGTERM, cleanup)


def start_plugin():
    """Start the error aggregator plugin."""
    global plugin_process
    plugin_script = os.path.join(os.path.dirname(__file__), "error_aggregator_plugin.py")
    
    print(f"🚀 Starting Error Aggregator Plugin on port {PLUGIN_PORT}...")
    plugin_process = subprocess.Popen(
        [sys.executable, plugin_script, str(PLUGIN_PORT)],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # Wait for plugin to start
    time.sleep(2)
    
    if plugin_process.poll() is not None:
        _, stderr = plugin_process.communicate()
        print(f"❌ Plugin failed to start: {stderr.decode()}")
        return False
    
    print("✅ Plugin started successfully")
    return True


def register_plugin():
    """Register the plugin with the backend."""
    print(f"\n📝 Registering plugin with backend...")
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/plugins/register",
            params={
                "name": "error-aggregator",
                "address": PLUGIN_ADDRESS
            }
        )
        response.raise_for_status()
        print(f"✅ Plugin registered: {response.json()}")
        return True
    except Exception as e:
        print(f"❌ Failed to register plugin: {e}")
        return False


def list_plugins():
    """List all registered plugins."""
    print("\n📋 Listing registered plugins...")
    
    try:
        response = requests.get(f"{BACKEND_URL}/plugins/list")
        response.raise_for_status()
        plugins = response.json()
        print(f"✅ Registered plugins: {plugins}")
        return True
    except Exception as e:
        print(f"❌ Failed to list plugins: {e}")
        return False


def process_logs():
    """Process logs with the plugin."""
    print("\n⚙️  Processing logs with error-aggregator plugin...")
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/plugins/process",
            params={
                "plugin_name": "error-aggregator",
                "level": "error"
            }
        )
        response.raise_for_status()
        result = response.json()
        
        print("\n" + "="*60)
        print("📊 RESULTS:")
        print("="*60)
        print(f"\n{result['summary']}\n")
        
        if result['results']:
            print("Error Types (sorted by frequency):")
            print("-" * 60)
            for idx, item in enumerate(result['results'], 1):
                print(f"\n{idx}. {item['key']}")
                print(f"   {item['value']}")
                if item['log_ids']:
                    print(f"   Sample Request IDs: {', '.join(item['log_ids'][:3])}")
        else:
            print("No errors found in logs.")
        
        print("\n" + "="*60)
        return True
    except requests.exceptions.HTTPException as e:
        if e.response.status_code == 404:
            print("⚠️  No logs found. Please upload some logs first!")
            print("\n💡 Tip: Upload logs via the web interface at http://localhost:3000")
        else:
            print(f"❌ Failed to process logs: {e}")
        return False
    except Exception as e:
        print(f"❌ Failed to process logs: {e}")
        return False


def main():
    """Main test flow."""
    print("="*60)
    print("🧪 Testing gRPC Plugin System for Terraform LogViewer")
    print("="*60)
    
    # Check if backend is running
    try:
        response = requests.get(f"{BACKEND_URL.replace('/api', '')}/health")
        response.raise_for_status()
        print("✅ Backend is running")
    except Exception as e:
        print(f"❌ Backend is not running. Please start it with docker-compose up")
        return 1
    
    # Start plugin
    if not start_plugin():
        return 1
    
    try:
        # Register plugin
        if not register_plugin():
            return 1
        
        # List plugins
        if not list_plugins():
            return 1
        
        # Process logs
        process_logs()
        
        print("\n" + "="*60)
        print("✅ Test completed!")
        print("\n💡 You can run this script anytime to re-process logs.")
        print("💡 The plugin will continue running until you press Ctrl+C.")
        print("="*60)
        
        # Keep plugin running
        print("\n⏳ Plugin is running. Press Ctrl+C to stop...")
        plugin_process.wait()
        
    except KeyboardInterrupt:
        pass
    finally:
        cleanup()
    
    return 0


if __name__ == "__main__":
    sys.exit(main())
