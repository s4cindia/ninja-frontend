# AWS Infrastructure Configuration

This document records critical AWS configuration settings that were manually configured.
These settings MUST be preserved when recreating or modifying AWS resources.

## Staging Environment

### Frontend CloudFront (E27G1PNUPX7M4D)
- **Domain**: dhi5xqbewozlg.cloudfront.net
- **Origin**: S3 bucket (s4carlisle-ninja-frontend-staging)
- **Purpose**: Serves static frontend assets

**Behavior Settings (Default)**:
| Setting | Value | Notes |
|---------|-------|-------|
| Cache Policy | CachingDisabled | Required for dynamic content |
| Origin Request Policy | CORS-S3Origin | Required for CORS |

### Backend CloudFront (ERLCMRRAZVMQV)
- **Domain**: d1ruc3qmc844x9.cloudfront.net
- **Origin**: ALB (ninja-alb-staging-823993315.ap-south-1.elb.amazonaws.com)
- **Purpose**: API proxy with CORS support

**Behavior Settings (Default)**:
| Setting | Value | Notes |
|---------|-------|-------|
| Cache Policy | CachingDisabled | APIs should not be cached |
| Origin Request Policy | CORS-S3Origin | **CRITICAL** - Required for CORS to work |

### API Gateway (tl89m5ecxd)
- **Domain**: tl89m5ecxd.execute-api.ap-south-1.amazonaws.com
- **Status**: NOT USED by frontend (causes CORS issues)
- **Note**: Frontend uses Backend CloudFront instead

## Production Environment

### Frontend CloudFront (E1QKQO2LS0HHWD)
- **Domain**: d2ymf9ge2z48qx.cloudfront.net
- **Origin**: S3 bucket (s4carlisle-ninja-frontend-prod)

### Backend CloudFront
- **Status**: NOT YET CREATED
- **TODO**: Create before production release (see GitHub Issue)

## Critical Configuration Notes

### CORS Configuration
1. Frontend MUST call Backend CloudFront URL, NOT API Gateway directly
2. Backend CloudFront MUST have Origin Request Policy set to `CORS-S3Origin` or `AllViewerExceptHostHeader`
3. Without proper Origin Request Policy, the `Origin` header is not forwarded and CORS fails

### Environment Variables
| Environment | Frontend API URL |
|-------------|------------------|
| Staging | https://d1ruc3qmc844x9.cloudfront.net/api/v1 |
| Production | TBD (requires Backend CloudFront) |

### Policy IDs (for reference)
| Policy Name | Policy ID |
|-------------|-----------|
| CachingDisabled | 4135ea2d-6df8-44a3-9df3-4b5a84be39ad |
| CORS-S3Origin | 88a5eaf4-2fd4-4709-b370-b4c650ea3fcf |
| AllViewerExceptHostHeader | b689b0a8-53d0-40ab-baf2-68738e2966ac |

## Troubleshooting

### CORS Errors on Login/API Calls
1. Check that frontend is using Backend CloudFront URL (not API Gateway)
2. Verify Backend CloudFront has Origin Request Policy set
3. Test with curl:
   ```bash
   curl -X OPTIONS "https://d1ruc3qmc844x9.cloudfront.net/api/v1/auth/login" \
     -H "Origin: https://dhi5xqbewozlg.cloudfront.net" \
     -H "Access-Control-Request-Method: POST" -i
   ```
4. Response MUST include Access-Control-Allow-Origin header
