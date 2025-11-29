# Create a new file: core/middleware.py
import time
import logging
from django.db import connection
from django.core.cache import cache

logger = logging.getLogger(__name__)

class DatabasePerformanceMiddleware:
    """Monitor database query performance and connection usage"""
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Reset query count
        initial_queries = len(connection.queries)
        start_time = time.time()
        
        # Process request
        response = self.get_response(request)
        
        # Calculate performance metrics
        end_time = time.time()
        total_queries = len(connection.queries) - initial_queries
        total_time = end_time - start_time
        
        # Log slow requests
        if total_time > 1.0 or total_queries > 10:
            logger.warning(
                f"Slow request: {request.path} | "
                f"Time: {total_time:.2f}s | "
                f"Queries: {total_queries} | "
                f"Method: {request.method}"
            )
            
            # Log individual slow queries in debug mode
            if hasattr(connection, 'queries') and len(connection.queries) > 0:
                for query in connection.queries[-total_queries:]:
                    if float(query['time']) > 0.1:  # Log queries slower than 100ms
                        logger.warning(f"Slow query ({query['time']}s): {query['sql'][:200]}...")

        # Add performance headers for debugging
        if hasattr(response, '__setitem__'):
            response['X-DB-Queries'] = str(total_queries)
            response['X-Response-Time'] = f"{total_time:.3f}"
        
        return response

# Add to settings.py MIDDLEWARE:
# 'core.middleware.DatabasePerformanceMiddleware',

class ConnectionPoolMiddleware:
    """Manage database connection lifecycle"""
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        try:
            response = self.get_response(request)
            return response
        finally:
            # Ensure connections are properly closed for long-running requests
            if hasattr(connection, 'close_if_unusable_or_obsolete'):
                connection.close_if_unusable_or_obsolete()