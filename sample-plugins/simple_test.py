#!/usr/bin/env python3
"""
Simple standalone test for the plugin system without needing the full docker setup.

This demonstrates:
1. Starting the plugin server
2. Calling it directly via gRPC
3. Verifying the results
"""

import sys
import os
import subprocess
import time
import grpc

# Add backend path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.plugins import log_plugin_pb2, log_plugin_pb2_grpc


def test_plugin_directly():
    """Test the plugin by calling it directly via gRPC."""
    
    print("="*60)
    print("🧪 Simple Plugin Test (без Docker)")
    print("="*60)
    
    # Start plugin in background
    plugin_script = os.path.join(os.path.dirname(__file__), "error_aggregator_plugin.py")
    print(f"\n🚀 Starting plugin server...")
    plugin_process = subprocess.Popen(
        [sys.executable, plugin_script, "50051"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )
    
    # Wait for plugin to start
    time.sleep(2)
    
    if plugin_process.poll() is not None:
        _, stderr = plugin_process.communicate()
        print(f"❌ Plugin failed to start: {stderr.decode()}")
        return False
    
    print("✅ Plugin started on port 50051")
    
    try:
        # Create test logs
        print("\n📝 Creating test logs...")
        test_logs = [
            log_plugin_pb2.LogEntry(
                level="error",
                timestamp="2024-01-01T10:00:00Z",
                message="Connection timeout: Failed to connect to provider",
                tf_req_id="req-001",
                tf_rpc="PlanResourceChange",
                tf_resource_type="aws_instance"
            ),
            log_plugin_pb2.LogEntry(
                level="error",
                timestamp="2024-01-01T10:05:00Z",
                message="Connection timeout: Failed to connect to provider",
                tf_req_id="req-002",
                tf_rpc="PlanResourceChange",
                tf_resource_type="aws_instance"
            ),
            log_plugin_pb2.LogEntry(
                level="error",
                timestamp="2024-01-01T10:10:00Z",
                message="Resource not found: aws_vpc.main does not exist",
                tf_req_id="req-003",
                tf_rpc="ReadResource",
                tf_resource_type="aws_vpc"
            ),
            log_plugin_pb2.LogEntry(
                level="info",
                timestamp="2024-01-01T10:15:00Z",
                message="Resource created successfully",
                tf_req_id="req-004",
                tf_rpc="ApplyResourceChange",
                tf_resource_type="aws_instance"
            ),
            log_plugin_pb2.LogEntry(
                level="error",
                timestamp="2024-01-01T10:20:00Z",
                message="Connection timeout: Failed to connect to provider",
                tf_req_id="req-005",
                tf_rpc="PlanResourceChange",
                tf_resource_type="aws_instance"
            ),
        ]
        
        print(f"✅ Created {len(test_logs)} test logs (3 errors, 1 info)")
        
        # Call plugin
        print("\n⚙️  Calling plugin...")
        with grpc.insecure_channel('localhost:50051') as channel:
            stub = log_plugin_pb2_grpc.LogPluginStub(channel)
            request = log_plugin_pb2.LogRequest(logs=test_logs)
            
            response = stub.ProcessLogs(request, timeout=10)
            
            # Display results
            print("\n" + "="*60)
            print("📊 RESULTS:")
            print("="*60)
            print(f"\n{response.summary}\n")
            
            if response.results:
                print("Error Types (sorted by frequency):")
                print("-" * 60)
                for idx, result in enumerate(response.results, 1):
                    print(f"\n{idx}. {result.key}")
                    print(f"   {result.value}")
                    print(f"   Request IDs: {', '.join(result.log_ids)}")
            
            print("\n" + "="*60)
            
            # Verify results
            assert len(response.results) == 2, f"Expected 2 error types, got {len(response.results)}"
            assert response.results[0].count == 3, f"Expected 3 'Connection timeout' errors, got {response.results[0].count}"
            assert response.results[1].count == 1, f"Expected 1 'Resource not found' error, got {response.results[1].count}"
            
            print("✅ All assertions passed!")
            print("="*60)
            
            return True
            
    except grpc.RpcError as e:
        print(f"❌ gRPC Error: {e}")
        return False
    except AssertionError as e:
        print(f"❌ Assertion failed: {e}")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Cleanup
        print("\n🛑 Stopping plugin server...")
        plugin_process.terminate()
        plugin_process.wait()
        print("✅ Cleanup complete")


if __name__ == "__main__":
    success = test_plugin_directly()
    sys.exit(0 if success else 1)
