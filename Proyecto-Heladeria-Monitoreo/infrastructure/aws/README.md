# AWS — Despliegue Heladería POS + Monitoreo (Persona 4 / Task 6)

Resumen: los 4 servicios (pos-backend :3000, monitoreo-backend :4000,
pos-frontend y monitoreo-frontend vía nginx :80) se despliegan en EKS con las
imágenes construidas por los Dockerfiles de cada app (ver `pos/posBackend/`,
`monitoreo/backend/`, `pos/frontend/`, `monitoreo/frontend/` y espejos en
`infrastructure/docker/`). Sin DB local: la persistencia es Supabase/PostgreSQL
gestionado. Manifiestos base en `infrastructure/kubernetes/`.

## TLS
1. Emitir certificados con ACM (recomendado) para `pos.tu-dominio.com` y
   `monitoreo.tu-dominio.com`, validación por DNS en Route 53.
2. Terminar TLS en el ALB (listeners 443 -> target groups HTTP a los
   NodePort/TargetGroupBinding del Ingress Controller).
3. Redirigir 80 -> 443 en el ALB; `force-ssl-redirect` ya está en los Ingress.
4. Alternativa en clúster: cert-manager + ClusterIssuer `letsencrypt-prod`
   (anotación ya presente en `pos/ingress.yaml` y `monitoreo/ingress.yaml`).

## Load Balancer
5. Usar AWS Load Balancer Controller: Ingress `class: alb` o NLB + ingress-nginx;
   un ALB por entorno (dev/staging/prod) con host-rules por servicio.
6. Health checks del ALB contra `/health` (backends) y `/` (frontends nginx),
   con `healthyThresholdCount: 2` y `intervalSeconds: 30`.
7. Activar access logs del ALB a S3 (bucket dedicado, cifrado SSE-S3) y
   `deletion_protection.enabled=true` en producción.

## WAF
8. Asociar AWS WAF al ALB con managed rules: `AWSManagedRulesCommonRuleSet`,
   `AWSManagedRulesKnownBadInputsRuleSet` y `AWSManagedRulesSQLiRuleSet`.
9. Añadir regla de rate-based (límite ~2000 req/5min por IP) como defensa
   complementaria al rate limit de Express (`RATE_LIMIT_*`).
10. Bloquear explícitamente cuerpos >100KB a nivel WAF en coherencia con
    `express.json({ limit: '100kb' })` del backend.

## Secretos
11. Guardar `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL*`, `*_API_KEY` y
    `SUPABASE_URL` en AWS Secrets Manager (un secreto por app/entorno,
    cifrado con KMS CMK propia, rotación programada para API keys).
12. Sincronizar a K8s con External Secrets Operator (`SecretStore` + dos
    `ExternalSecret`: `pos-secrets` en ns `heladeria`, `monitoreo-secrets` en
    ns `monitoreo`); jamás commitear valores reales (ver `secrets.example.yaml`).
13. La service-role key SOLO vive en los backends; los frontends solo reciben
    `VITE_API_URL` (arg de build) y nunca secretos.

## Logs y monitoreo
14. Enviar logs de contenedores a CloudWatch Logs vía FireLens/Fluent Bit
    (grupo `/eks/heladeria/<servicio>`, retención 30 días prod) y métricas a
    Container Insights; alarmas CloudWatch sobre 5xx del ALB y latencia p95.
15. Trazabilidad: propagar el `requestId` (middleware ya existente) hasta
    CloudWatch Logs Insights; correlacionar `ColaIntegracion` POS ->
    `RecepcionConsumoPOS` Monitoreo por `consumoExternoId`/`idempotencyKey`.
