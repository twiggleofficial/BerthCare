locals {
  api_metric_namespace = "BerthCare/API"
  api_metric_dimensions = {
    Environment = var.environment
  }
  backend_log_group_name = "/aws/ecs/${local.name_prefix}/backend"
  dashboard_name         = "${local.name_prefix}-observability"
}

resource "aws_cloudwatch_log_group" "backend" {
  name              = local.backend_log_group_name
  retention_in_days = var.log_retention_days

  tags = {
    Name        = "${local.name_prefix}-backend-logs"
    Environment = var.environment
    Service     = "backend"
  }
}

resource "aws_sns_topic" "alerts" {
  name = "${local.name_prefix}-alerts"

  kms_master_key_id = "alias/aws/sns"

  tags = {
    Name        = "${local.name_prefix}-alerts"
    Environment = var.environment
  }
}

resource "aws_cloudwatch_log_metric_filter" "http_request_count" {
  name           = "${local.name_prefix}-http-request-count"
  log_group_name = aws_cloudwatch_log_group.backend.name
  pattern        = "{ $.event = \"http_request\" }"

  metric_transformation {
    name          = "RequestCount"
    namespace     = local.api_metric_namespace
    value         = "1"
    unit          = "Count"
    default_value = 0
    dimensions    = local.api_metric_dimensions
  }
}

resource "aws_cloudwatch_log_metric_filter" "http_error_count" {
  name           = "${local.name_prefix}-http-error-count"
  log_group_name = aws_cloudwatch_log_group.backend.name
  pattern        = "{ $.event = \"http_request\" && $.status_code >= 500 }"

  metric_transformation {
    name          = "ErrorCount"
    namespace     = local.api_metric_namespace
    value         = "1"
    unit          = "Count"
    default_value = 0
    dimensions    = local.api_metric_dimensions
  }
}

resource "aws_cloudwatch_log_metric_filter" "http_latency" {
  name           = "${local.name_prefix}-http-latency"
  log_group_name = aws_cloudwatch_log_group.backend.name
  pattern        = "{ $.event = \"http_request\" && $.latency_ms = * }"

  metric_transformation {
    name       = "APILatency"
    namespace  = local.api_metric_namespace
    value      = "$.latency_ms"
    unit       = "Milliseconds"
    dimensions = local.api_metric_dimensions
  }
}

resource "aws_cloudwatch_dashboard" "observability" {
  dashboard_name = local.dashboard_name

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "API Latency (ms)"
          view   = "timeSeries"
          region = var.aws_region
          stat   = "p95"
          metrics = [
            ["BerthCare/API", "APILatency", "Environment", var.environment, { "label" : "p50", "stat" : "p50", "color" : "#2ca02c" }],
            ["BerthCare/API", "APILatency", "Environment", var.environment, { "label" : "p95", "stat" : "p95", "color" : "#ff7f0e" }],
            ["BerthCare/API", "APILatency", "Environment", var.environment, { "label" : "p99", "stat" : "p99", "color" : "#d62728" }]
          ]
          period = 300
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "API Error Rate (%)"
          view   = "timeSeries"
          region = var.aws_region
          yAxis = {
            left = {
              label = "Percent"
              min   = 0
            }
          }
          period = 300
          metrics = [
            [{ "expression" : "IF(requests>0,(errors/requests)*100,0)", "label" : "Error Rate %", "id" : "error_rate", "period" : 300 }],
            ["BerthCare/API", "RequestCount", "Environment", var.environment, { "id" : "requests", "stat" : "Sum", "visible" : false, "period" : 300 }],
            ["BerthCare/API", "ErrorCount", "Environment", var.environment, { "id" : "errors", "stat" : "Sum", "visible" : false, "period" : 300 }]
          ]
        }
      },
      {
        type   = "metric"
        width  = 12
        height = 6
        properties = {
          title  = "Database Connections"
          view   = "timeSeries"
          region = var.aws_region
          stat   = "Average"
          period = 300
          metrics = [
            ["AWS/RDS", "DatabaseConnections", "DBInstanceIdentifier", aws_db_instance.postgres.id]
          ]
        }
      }
    ]
  })
}

resource "aws_cloudwatch_metric_alarm" "api_error_rate" {
  alarm_name          = "${local.name_prefix}-api-error-rate"
  alarm_description   = "API error rate above 1% over a 5 minute window."
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 1
  treat_missing_data  = "notBreaching"
  datapoints_to_alarm = 1

  metric_query {
    id          = "error_rate"
    expression  = "IF(requests>0,(errors/requests)*100,0)"
    label       = "API Error Rate %"
    return_data = true
  }

  metric_query {
    id = "requests"

    metric {
      namespace   = local.api_metric_namespace
      metric_name = "RequestCount"
      dimensions  = local.api_metric_dimensions
      period      = 300
      stat        = "Sum"
    }
  }

  metric_query {
    id = "errors"

    metric {
      namespace   = local.api_metric_namespace
      metric_name = "ErrorCount"
      dimensions  = local.api_metric_dimensions
      period      = 300
      stat        = "Sum"
    }
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "api_latency_p95" {
  alarm_name          = "${local.name_prefix}-api-latency-p95"
  alarm_description   = "API latency p95 above 2 seconds over a 5 minute window."
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 1
  threshold           = 2000
  treat_missing_data  = "notBreaching"
  datapoints_to_alarm = 1

  metric_query {
    id = "m1"

    metric {
      namespace   = local.api_metric_namespace
      metric_name = "APILatency"
      dimensions  = local.api_metric_dimensions
      period      = 300
      stat        = "p95"
    }

    return_data = true
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}
