#!/usr/bin/env python3
"""
Alert Test Data Injector
Injects test conditions to trigger specific alerts
"""

import argparse
import json
import requests
import time
from datetime import datetime, timedelta
from typing import Dict, List
import sys

class AlertInjector:
    """Injects test conditions to trigger alerts"""

    def __init__(self, prometheus_url: str = "http://prometheus:9090",
                 pushgateway_url: str = "http://pushgateway:9091"):
        self.prometheus_url = prometheus_url
        self.pushgateway_url = pushgateway_url

    def inject_high_error_rate(self, service: str = "test-service",
                               duration_minutes: int = 5):
        """Inject metrics showing high error rate"""
        print(f"Injecting high error rate for {service} (duration: {duration_minutes}min)")

        # Calculate start/end times
        start_time = time.time()
        end_time = start_time + (duration_minutes * 60)

        metrics_injected = 0

        while time.time() < end_time:
            # Inject error metrics
            metrics = f"""
# TYPE http_requests_total counter
http_requests_total{{service="{service}",status="200"}} 100
http_requests_total{{service="{service}",status="500"}} 150

# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{{service="{service}",le="0.1"}} 50
http_request_duration_seconds_bucket{{service="{service}",le="0.5"}} 100
http_request_duration_seconds_bucket{{service="{service}",le="1.0"}} 200
http_request_duration_seconds_bucket{{service="{service}",le="+Inf"}} 250
http_request_duration_seconds_sum{{service="{service}"}} 125.5
http_request_duration_seconds_count{{service="{service}"}} 250
"""

            try:
                response = requests.post(
                    f"{self.pushgateway_url}/metrics/job/alert_test/instance/{service}",
                    data=metrics,
                    headers={"Content-Type": "text/plain"}
                )

                if response.status_code in [200, 202]:
                    metrics_injected += 1
                    print(f"✓ Metrics injected ({metrics_injected})", end="\r")
                else:
                    print(f"\n✗ Failed to inject metrics: {response.status_code}")

            except Exception as e:
                print(f"\n✗ Error injecting metrics: {e}")
                return False

            time.sleep(15)  # Inject every 15 seconds

        print(f"\n✓ Injected {metrics_injected} metric batches")
        return True

    def inject_high_latency(self, service: str = "test-service",
                           latency_ms: int = 2000,
                           duration_minutes: int = 5):
        """Inject metrics showing high latency"""
        print(f"Injecting high latency for {service} ({latency_ms}ms, duration: {duration_minutes}min)")

        start_time = time.time()
        end_time = start_time + (duration_minutes * 60)

        while time.time() < end_time:
            # Create histogram buckets for high latency
            metrics = f"""
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{{service="{service}",le="0.1"}} 10
http_request_duration_seconds_bucket{{service="{service}",le="0.5"}} 20
http_request_duration_seconds_bucket{{service="{service}",le="1.0"}} 30
http_request_duration_seconds_bucket{{service="{service}",le="2.0"}} 40
http_request_duration_seconds_bucket{{service="{service}",le="5.0"}} 80
http_request_duration_seconds_bucket{{service="{service}",le="+Inf"}} 100
http_request_duration_seconds_sum{{service="{service}"}} {latency_ms / 1000 * 100}
http_request_duration_seconds_count{{service="{service}"}} 100
"""

            try:
                response = requests.post(
                    f"{self.pushgateway_url}/metrics/job/alert_test/instance/{service}",
                    data=metrics
                )

                if response.status_code in [200, 202]:
                    print("✓ Metrics injected", end="\r")
                else:
                    print(f"\n✗ Failed: {response.status_code}")

            except Exception as e:
                print(f"\n✗ Error: {e}")
                return False

            time.sleep(15)

        print("\n✓ Latency metrics injection complete")
        return True

    def inject_resource_exhaustion(self, service: str = "test-service",
                                   resource_type: str = "memory",
                                   usage_percent: int = 95,
                                   duration_minutes: int = 5):
        """Inject metrics showing resource exhaustion"""
        print(f"Injecting {resource_type} exhaustion for {service} ({usage_percent}%, duration: {duration_minutes}min)")

        start_time = time.time()
        end_time = start_time + (duration_minutes * 60)

        while time.time() < end_time:
            if resource_type == "memory":
                metrics = f"""
# TYPE container_memory_usage_bytes gauge
container_memory_usage_bytes{{container="{service}"}} {usage_percent * 10**7}

# TYPE container_spec_memory_limit_bytes gauge
container_spec_memory_limit_bytes{{container="{service}"}} {100 * 10**7}
"""
            elif resource_type == "cpu":
                metrics = f"""
# TYPE container_cpu_usage_seconds_total counter
container_cpu_usage_seconds_total{{container="{service}"}} {usage_percent * 1000}

# TYPE container_spec_cpu_quota gauge
container_spec_cpu_quota{{container="{service}"}} {100000}
"""
            else:
                print(f"✗ Unknown resource type: {resource_type}")
                return False

            try:
                response = requests.post(
                    f"{self.pushgateway_url}/metrics/job/alert_test/instance/{service}",
                    data=metrics
                )

                if response.status_code in [200, 202]:
                    print("✓ Metrics injected", end="\r")

            except Exception as e:
                print(f"\n✗ Error: {e}")
                return False

            time.sleep(15)

        print("\n✓ Resource exhaustion metrics injection complete")
        return True

    def clear_injected_metrics(self, service: str = "test-service"):
        """Clear injected test metrics"""
        print(f"Clearing injected metrics for {service}...")

        try:
            response = requests.delete(
                f"{self.pushgateway_url}/metrics/job/alert_test/instance/{service}"
            )

            if response.status_code in [200, 202]:
                print("✓ Metrics cleared")
                return True
            else:
                print(f"✗ Failed to clear metrics: {response.status_code}")
                return False

        except Exception as e:
            print(f"✗ Error clearing metrics: {e}")
            return False


class AlertVerifier:
    """Verifies that alerts fire correctly"""

    def __init__(self, alertmanager_url: str = "http://alertmanager:9093"):
        self.alertmanager_url = alertmanager_url

    def wait_for_alert(self, alert_name: str, timeout: int = 180) -> bool:
        """Wait for specific alert to fire"""
        print(f"Waiting for alert '{alert_name}' to fire (timeout: {timeout}s)...")

        start_time = time.time()

        while time.time() - start_time < timeout:
            alerts = self.get_active_alerts()

            for alert in alerts:
                if alert.get('labels', {}).get('alertname') == alert_name:
                    elapsed = int(time.time() - start_time)
                    print(f"✓ Alert '{alert_name}' fired after {elapsed}s")
                    return True

            print(".", end="", flush=True)
            time.sleep(5)

        print(f"\n✗ Alert '{alert_name}' did not fire within {timeout}s")
        return False

    def get_active_alerts(self) -> List[Dict]:
        """Get list of currently active alerts"""
        try:
            response = requests.get(f"{self.alertmanager_url}/api/v2/alerts")
            response.raise_for_status()

            alerts = response.json()
            return [a for a in alerts if a.get('status', {}).get('state') == 'active']

        except Exception as e:
            print(f"✗ Error fetching alerts: {e}")
            return []

    def verify_alert_labels(self, alert_name: str,
                           expected_labels: Dict[str, str]) -> bool:
        """Verify alert has expected labels"""
        print(f"Verifying labels for alert '{alert_name}'...")

        alerts = self.get_active_alerts()

        for alert in alerts:
            if alert.get('labels', {}).get('alertname') == alert_name:
                labels = alert.get('labels', {})

                for key, expected_value in expected_labels.items():
                    actual_value = labels.get(key)

                    if actual_value != expected_value:
                        print(f"✗ Label mismatch: {key}={actual_value}, expected {expected_value}")
                        return False

                print("✓ All labels verified")
                return True

        print(f"✗ Alert '{alert_name}' not found")
        return False

    def verify_alert_annotations(self, alert_name: str,
                                required_annotations: List[str]) -> bool:
        """Verify alert has required annotations"""
        print(f"Verifying annotations for alert '{alert_name}'...")

        alerts = self.get_active_alerts()

        for alert in alerts:
            if alert.get('labels', {}).get('alertname') == alert_name:
                annotations = alert.get('annotations', {})

                for annotation in required_annotations:
                    if annotation not in annotations:
                        print(f"✗ Missing annotation: {annotation}")
                        return False

                print("✓ All annotations present")
                return True

        print(f"✗ Alert '{alert_name}' not found")
        return False


def main():
    parser = argparse.ArgumentParser(description="Alert Test Data Injector")
    parser.add_argument('--prometheus-url', default='http://prometheus:9090',
                       help='Prometheus URL')
    parser.add_argument('--pushgateway-url', default='http://pushgateway:9091',
                       help='Pushgateway URL')
    parser.add_argument('--alertmanager-url', default='http://alertmanager:9093',
                       help='AlertManager URL')

    subparsers = parser.add_subparsers(dest='command', help='Command to execute')

    # Inject high error rate
    inject_error = subparsers.add_parser('inject-error-rate',
                                         help='Inject high error rate')
    inject_error.add_argument('--service', default='test-service',
                             help='Service name')
    inject_error.add_argument('--duration', type=int, default=5,
                             help='Duration in minutes')

    # Inject high latency
    inject_latency = subparsers.add_parser('inject-latency',
                                           help='Inject high latency')
    inject_latency.add_argument('--service', default='test-service',
                               help='Service name')
    inject_latency.add_argument('--latency', type=int, default=2000,
                               help='Latency in milliseconds')
    inject_latency.add_argument('--duration', type=int, default=5,
                               help='Duration in minutes')

    # Inject resource exhaustion
    inject_resource = subparsers.add_parser('inject-resource-exhaustion',
                                           help='Inject resource exhaustion')
    inject_resource.add_argument('--service', default='test-service',
                                help='Service name')
    inject_resource.add_argument('--resource', choices=['memory', 'cpu'],
                                default='memory', help='Resource type')
    inject_resource.add_argument('--usage', type=int, default=95,
                                help='Usage percentage')
    inject_resource.add_argument('--duration', type=int, default=5,
                                help='Duration in minutes')

    # Clear metrics
    clear = subparsers.add_parser('clear', help='Clear injected metrics')
    clear.add_argument('--service', default='test-service', help='Service name')

    # Wait for alert
    wait = subparsers.add_parser('wait-for-alert',
                                help='Wait for alert to fire')
    wait.add_argument('alert_name', help='Alert name')
    wait.add_argument('--timeout', type=int, default=180,
                     help='Timeout in seconds')

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        return 1

    injector = AlertInjector(args.prometheus_url, args.pushgateway_url)
    verifier = AlertVerifier(args.alertmanager_url)

    try:
        if args.command == 'inject-error-rate':
            success = injector.inject_high_error_rate(args.service, args.duration)
        elif args.command == 'inject-latency':
            success = injector.inject_high_latency(args.service, args.latency, args.duration)
        elif args.command == 'inject-resource-exhaustion':
            success = injector.inject_resource_exhaustion(args.service, args.resource, args.usage, args.duration)
        elif args.command == 'clear':
            success = injector.clear_injected_metrics(args.service)
        elif args.command == 'wait-for-alert':
            success = verifier.wait_for_alert(args.alert_name, args.timeout)
        else:
            print(f"Unknown command: {args.command}")
            return 1

        return 0 if success else 1

    except KeyboardInterrupt:
        print("\n\n✗ Interrupted by user")
        return 130
    except Exception as e:
        print(f"\n✗ Error: {e}")
        return 1


if __name__ == '__main__':
    sys.exit(main())
