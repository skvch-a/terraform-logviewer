"""Plugin manager for loading and executing log processing plugins."""

import grpc
import json
from typing import List, Dict, Any

from app.plugins import log_plugin_pb2, log_plugin_pb2_grpc
from app.models import TerraformLog


class PluginManager:
    """Manages gRPC plugins for log processing."""
    
    def __init__(self):
        self.plugins: Dict[str, str] = {}
    
    def register_plugin(self, name: str, address: str):
        """Register a plugin by name and gRPC address."""
        self.plugins[name] = address
    
    def process_logs_with_plugin(
        self, 
        plugin_name: str, 
        logs: List[TerraformLog],
        options: Dict[str, str] = None
    ) -> Dict[str, Any]:
        """
        Process logs using a registered plugin.
        
        Args:
            plugin_name: Name of the plugin to use
            logs: List of log entries to process
            options: Optional parameters for the plugin
            
        Returns:
            Dictionary with processing results
        """
        if plugin_name not in self.plugins:
            raise ValueError(f"Plugin '{plugin_name}' not registered")
        
        plugin_address = self.plugins[plugin_name]
        
        # Convert logs to protobuf format
        log_entries = []
        for log in logs:
            log_entry = log_plugin_pb2.LogEntry(
                level=log.log_level or "",
                timestamp=log.timestamp or "",
                message=log.message or "",
                tf_req_id=log.tf_req_id or "",
                tf_rpc=log.tf_rpc or "",
                tf_resource_type=log.tf_resource_type or "",
                raw_json=json.dumps(log.raw_data) if log.raw_data else "{}"
            )
            log_entries.append(log_entry)
        
        # Create request
        request = log_plugin_pb2.LogRequest(
            logs=log_entries,
            options=options or {}
        )
        
        # Call plugin via gRPC
        try:
            with grpc.insecure_channel(plugin_address) as channel:
                stub = log_plugin_pb2_grpc.LogPluginStub(channel)
                response = stub.ProcessLogs(request, timeout=30)
                
                # Convert response to dict
                results = []
                for result in response.results:
                    results.append({
                        'key': result.key,
                        'value': result.value,
                        'count': result.count,
                        'log_ids': list(result.log_ids)
                    })
                
                return {
                    'results': results,
                    'summary': response.summary
                }
        except grpc.RpcError as e:
            raise RuntimeError(f"Plugin call failed: {e.details()}")
    
    def list_plugins(self) -> Dict[str, str]:
        """List all registered plugins."""
        return self.plugins.copy()


# Global plugin manager instance
plugin_manager = PluginManager()
