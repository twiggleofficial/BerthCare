locals {
  monitoring_ecs_cluster_name         = length(trimspace(var.ecs_cluster_name)) > 0 ? var.ecs_cluster_name : "${local.name_prefix}-cluster"
  monitoring_ecs_service_name         = length(trimspace(var.ecs_service_name)) > 0 ? var.ecs_service_name : "${local.name_prefix}-api"
  monitoring_sentry_environment       = length(trimspace(var.sentry_environment)) > 0 ? var.sentry_environment : var.environment
  monitoring_api_load_balancer_suffix = length(trimspace(var.api_load_balancer_arn_suffix)) > 0 ? var.api_load_balancer_arn_suffix : null
  monitoring_api_target_group_suffix  = length(trimspace(var.api_target_group_arn_suffix)) > 0 ? var.api_target_group_arn_suffix : null

  monitoring_api_widgets = local.monitoring_api_load_balancer_suffix != null && local.monitoring_api_target_group_suffix != null ? [
    {
      type   = "metric"
      width  = 12
      height = 6
      properties = {
        title   = "API Latency (p50/p95/p99)"
        region  = var.aws_region
        view    = "timeSeries"
        stacked = false
        period  = 60
        metrics = [
          [
            "AWS/ApplicationELB",
            "TargetResponseTime",
            "LoadBalancer",
            local.monitoring_api_load_balancer_suffix,
            "TargetGroup",
            local.monitoring_api_target_group_suffix,
            { stat = "p50", label = "p50" }
          ],
          [
            ".",
            ".",
            ".",
            ".",
            ".",
            ".",
            { stat = "p95", label = "p95" }
          ],
          [
            ".",
            ".",
            ".",
            ".",
            ".",
            ".",
            { stat = "p99", label = "p99" }
          ]
        ]
      }
    },
    {
      type   = "metric"
      width  = 12
      height = 6
      properties = {
        title   = "API Error Rate (%)"
        region  = var.aws_region
        view    = "timeSeries"
        stacked = false
        period  = 60
        metrics = [
          [
            { expression = "IF(m_requests > 0, 100 * (m_4xx + m_5xx) / m_requests, 0)", label = "Error %", id = "e1" }
          ],
          [
            { id = "m_requests", stat = "Sum", label = "Requests", visible = false },
            "AWS/ApplicationELB",
            "RequestCount",
            "LoadBalancer",
            local.monitoring_api_load_balancer_suffix,
            "TargetGroup",
            local.monitoring_api_target_group_suffix
          ],
          [
            { id = "m_4xx", stat = "Sum", label = "Target 4XX", visible = false },
            "AWS/ApplicationELB",
            "HTTPCode_Target_4XX_Count",
            "LoadBalancer",
            local.monitoring_api_load_balancer_suffix,
            "TargetGroup",
            local.monitoring_api_target_group_suffix
          ],
          [
            { id = "m_5xx", stat = "Sum", label = "Target 5XX", visible = false },
            "AWS/ApplicationELB",
            "HTTPCode_Target_5XX_Count",
            "LoadBalancer",
            local.monitoring_api_load_balancer_suffix,
            "TargetGroup",
            local.monitoring_api_target_group_suffix
          ]
        ]
      }
    },
    {
      type   = "metric"
      width  = 12
      height = 6
      properties = {
        title   = "API Throughput (req/min)"
        region  = var.aws_region
        view    = "timeSeries"
        stacked = false
        period  = 60
        metrics = [
          [
            "AWS/ApplicationELB",
            "RequestCount",
            "LoadBalancer",
            local.monitoring_api_load_balancer_suffix,
            "TargetGroup",
            local.monitoring_api_target_group_suffix,
            { stat = "Sum", label = "Requests" }
          ]
        ]
      }
    }
  ] : []

  monitoring_ecs_widgets = length(local.monitoring_ecs_cluster_name) > 0 && length(local.monitoring_ecs_service_name) > 0 ? [
    {
      type   = "metric"
      width  = 12
      height = 6
      properties = {
        title   = "API Service Utilization"
        region  = var.aws_region
        view    = "timeSeries"
        stacked = false
        period  = 60
        metrics = [
          [
            "AWS/ECS",
            "CPUUtilization",
            "ClusterName",
            local.monitoring_ecs_cluster_name,
            "ServiceName",
            local.monitoring_ecs_service_name,
            { stat = "Average", label = "CPU (%)" }
          ],
          [
            ".",
            "MemoryUtilization",
            ".",
            ".",
            ".",
            ".",
            { stat = "Average", label = "Memory (%)" }
          ]
        ]
      }
    }
  ] : []

  monitoring_foundational_widgets = [
    {
      type   = "metric"
      width  = 12
      height = 6
      properties = {
        title   = "PostgreSQL Health"
        region  = var.aws_region
        view    = "timeSeries"
        stacked = false
        period  = 300
        yAxis = {
          left  = { label = "CPU %", min = 0, max = 100 }
          right = { label = "Connections" }
        }
        metrics = [
          [
            "AWS/RDS",
            "CPUUtilization",
            "DBInstanceIdentifier",
            module.rds.db_instance_identifier,
            { stat = "Average", label = "CPU %" }
          ],
          [
            ".",
            "DatabaseConnections",
            ".",
            ".",
            { stat = "Average", label = "Connections", yAxis = "right" }
          ]
        ]
      }
    },
    {
      type   = "metric"
      width  = 12
      height = 6
      properties = {
        title   = "Redis Health"
        region  = var.aws_region
        view    = "timeSeries"
        stacked = false
        period  = 300
        metrics = [
          [
            "AWS/ElastiCache",
            "CPUUtilization",
            "ReplicationGroupId",
            aws_elasticache_replication_group.redis.id,
            { stat = "Average", label = "CPU %" }
          ],
          [
            ".",
            "FreeableMemory",
            ".",
            ".",
            { stat = "Average", label = "Freeable Memory (bytes)", yAxis = "right" }
          ],
          [
            { expression = "IF(m_hits + m_misses > 0, 100 * m_hits / (m_hits + m_misses), 0)", label = "Hit Rate (%)", id = "e_hit" }
          ],
          [
            { id = "m_hits", stat = "Sum", label = "CacheHits", visible = false },
            "AWS/ElastiCache",
            "CacheHits",
            "ReplicationGroupId",
            aws_elasticache_replication_group.redis.id
          ],
          [
            { id = "m_misses", stat = "Sum", label = "CacheMisses", visible = false },
            "AWS/ElastiCache",
            "CacheMisses",
            "ReplicationGroupId",
            aws_elasticache_replication_group.redis.id
          ]
        ]
      }
    }
  ]

  monitoring_dashboard_widgets = concat(local.monitoring_api_widgets, local.monitoring_ecs_widgets, local.monitoring_foundational_widgets)
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/aws/ecs/${local.monitoring_ecs_service_name}"
  retention_in_days = var.log_retention_days

  tags = local.common_tags
}

resource "aws_cloudwatch_log_metric_filter" "api_error_count" {
  name           = "${local.name_prefix}-api-error-count"
  log_group_name = aws_cloudwatch_log_group.api.name
  pattern        = "{ $.level = \"error\" || $.level = \"ERROR\" }"

  metric_transformation {
    name      = "${local.name_prefix}-api-error-count"
    namespace = "Berthcare/API"
    value     = "1"
    unit      = "Count"
  }
}

resource "aws_sns_topic" "alerts" {
  name = "${local.name_prefix}-alerts"

  tags = local.common_tags
}

resource "aws_sns_topic_subscription" "alerts_email" {
  for_each = { for email in var.alert_subscription_emails : email => email }

  topic_arn = aws_sns_topic.alerts.arn
  protocol  = "email"
  endpoint  = each.value
}

resource "aws_cloudwatch_metric_alarm" "api_high_error_rate" {
  count = local.monitoring_api_load_balancer_suffix != null && local.monitoring_api_target_group_suffix != null ? 1 : 0

  alarm_name          = "${local.name_prefix}-api-high-error-rate"
  alarm_description   = "API error rate exceeded 5% for three consecutive minutes."
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  datapoints_to_alarm = 3
  threshold           = 5
  treat_missing_data  = "notBreaching"

  metric_query {
    id          = "m_requests"
    return_data = false

    metric {
      metric_name = "RequestCount"
      namespace   = "AWS/ApplicationELB"
      period      = 60
      stat        = "Sum"
      dimensions = {
        LoadBalancer = local.monitoring_api_load_balancer_suffix
        TargetGroup  = local.monitoring_api_target_group_suffix
      }
    }
  }

  metric_query {
    id          = "m_4xx"
    return_data = false

    metric {
      metric_name = "HTTPCode_Target_4XX_Count"
      namespace   = "AWS/ApplicationELB"
      period      = 60
      stat        = "Sum"
      dimensions = {
        LoadBalancer = local.monitoring_api_load_balancer_suffix
        TargetGroup  = local.monitoring_api_target_group_suffix
      }
    }
  }

  metric_query {
    id          = "m_5xx"
    return_data = false

    metric {
      metric_name = "HTTPCode_Target_5XX_Count"
      namespace   = "AWS/ApplicationELB"
      period      = 60
      stat        = "Sum"
      dimensions = {
        LoadBalancer = local.monitoring_api_load_balancer_suffix
        TargetGroup  = local.monitoring_api_target_group_suffix
      }
    }
  }

  metric_query {
    id          = "e_error_rate"
    label       = "Error Rate %"
    expression  = "IF(m_requests > 0, 100 * (m_4xx + m_5xx) / m_requests, 0)"
    return_data = true
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_metric_alarm" "db_high_cpu" {
  alarm_name          = "${local.name_prefix}-db-high-cpu"
  alarm_description   = "Database CPU utilization exceeded 80% for 15 minutes."
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 3
  datapoints_to_alarm = 3
  threshold           = 80
  treat_missing_data  = "notBreaching"
  period              = 300
  statistic           = "Average"
  namespace           = "AWS/RDS"
  metric_name         = "CPUUtilization"

  dimensions = {
    DBInstanceIdentifier = module.rds.db_instance_identifier
  }

  alarm_actions = [aws_sns_topic.alerts.arn]
  ok_actions    = [aws_sns_topic.alerts.arn]
}

resource "aws_cloudwatch_dashboard" "observability" {
  dashboard_name = "${local.name_prefix}-observability"
  dashboard_body = jsonencode({
    widgets = local.monitoring_dashboard_widgets
  })
}
