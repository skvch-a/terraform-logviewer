import sentry_sdk
from sqlalchemy.orm import Session

from app.models import TerraformLog


def send_error_logs_to_sentry(db: Session, dsn: str) -> dict:
    """
    Send all ERROR level logs to Sentry.
    
    Args:
        db: Database session
        dsn: Sentry DSN (Data Source Name)
    """
    # Initialize Sentry with provided DSN
    sentry_sdk.init(
        dsn=dsn,
        traces_sample_rate=0.0,
    )

    # Query all ERROR level logs
    error_logs = db.query(TerraformLog).filter(
        TerraformLog.log_level.ilike('error')
    ).all()

    if not error_logs:
        return {
            "status": "success",
            "message": "No ERROR logs found",
            "count": 0
        }

    sent_count = 0
    for log in error_logs:
        try:
            # Capture each error log as a message with context
            with sentry_sdk.push_scope() as scope:
                # Add log metadata as context
                scope.set_context("log_info", {
                    "filename": log.filename,
                    "timestamp": str(log.timestamp) if log.timestamp else None,
                    "tf_req_id": log.tf_req_id,
                    "tf_resource_type": log.tf_resource_type,
                    "tf_rpc": log.tf_rpc,
                    "caller": log.caller,
                    "module": log.module,
                })

                # Add tags for easier filtering in Sentry
                if log.tf_resource_type:
                    scope.set_tag("resource_type", log.tf_resource_type)
                if log.tf_rpc:
                    scope.set_tag("rpc", log.tf_rpc)
                if log.tf_req_id:
                    scope.set_tag("request_id", log.tf_req_id)

                scope.set_tag("log_level", "ERROR")
                scope.set_tag("filename", log.filename)

                # Send the message to Sentry
                sentry_sdk.capture_message(
                    log.message or "No message",
                    level="error"
                )
                sent_count += 1
        except Exception as e:
            print(f"Failed to send log {log.id} to Sentry: {e}")

    sentry_sdk.flush(timeout=10)

    return {
        "status": "success",
        "message": f"Sent {sent_count} ERROR logs to Sentry",
        "count": sent_count,
        "total_errors": len(error_logs)
    }
