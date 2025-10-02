"""
Sample gRPC plugin for error aggregation.

This plugin aggregates error logs by type and repeatability.
"""

import sys
import os
from concurrent import futures
import grpc
import json
from collections import defaultdict

# Add backend path to import proto files
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))

from app.plugins import log_plugin_pb2, log_plugin_pb2_grpc


class ErrorAggregatorPlugin(log_plugin_pb2_grpc.LogPluginServicer):
    """Plugin that aggregates errors by type and repeatability."""
    
    def ProcessLogs(self, request, context):
        """Process logs and aggregate errors."""
        
        # Aggregate errors by message pattern
        error_patterns = defaultdict(lambda: {
            'count': 0,
            'log_ids': [],
            'timestamps': [],
            'first_seen': None,
            'last_seen': None
        })
        
        # Process only error-level logs
        for log in request.logs:
            if log.level.lower() == 'error':
                # Extract error type from message
                error_type = self._extract_error_type(log.message)
                
                error_patterns[error_type]['count'] += 1
                error_patterns[error_type]['log_ids'].append(log.tf_req_id or "unknown")
                error_patterns[error_type]['timestamps'].append(log.timestamp)
                
                if error_patterns[error_type]['first_seen'] is None:
                    error_patterns[error_type]['first_seen'] = log.timestamp
                error_patterns[error_type]['last_seen'] = log.timestamp
        
        # Build results
        results = []
        for error_type, data in sorted(error_patterns.items(), key=lambda x: x[1]['count'], reverse=True):
            result = log_plugin_pb2.ProcessedResult(
                key=error_type,
                value=f"Count: {data['count']}, First: {data['first_seen']}, Last: {data['last_seen']}",
                count=data['count'],
                log_ids=data['log_ids'][:10]  # Limit to first 10 IDs
            )
            results.append(result)
        
        # Create summary
        total_errors = sum(data['count'] for data in error_patterns.values())
        unique_types = len(error_patterns)
        summary = f"Total errors: {total_errors}, Unique error types: {unique_types}"
        
        if error_patterns:
            most_common = max(error_patterns.items(), key=lambda x: x[1]['count'])
            summary += f", Most common: '{most_common[0]}' ({most_common[1]['count']} times)"
        
        return log_plugin_pb2.LogResponse(
            results=results,
            summary=summary
        )
    
    def _extract_error_type(self, message: str) -> str:
        """Extract error type from message."""
        # Simple heuristic: use first 50 chars or until first colon/newline
        if ':' in message:
            return message.split(':', 1)[0].strip()
        elif '\n' in message:
            return message.split('\n', 1)[0].strip()
        else:
            return message[:50].strip()


def serve(port=50051):
    """Start the plugin server."""
    server = grpc.server(futures.ThreadPoolExecutor(max_workers=10))
    log_plugin_pb2_grpc.add_LogPluginServicer_to_server(
        ErrorAggregatorPlugin(), server
    )
    server.add_insecure_port(f'[::]:{port}')
    server.start()
    print(f"Error Aggregator Plugin running on port {port}")
    server.wait_for_termination()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 50051
    serve(port)
