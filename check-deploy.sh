#!/bin/bash
echo "Monitoring Render deployment..."
echo "Started at: $(date +%H:%M:%S)"
echo ""

for i in {1..20}; do
  response=$(curl -s https://api.realassistagents.com/api/health)
  commit=$(echo $response | grep -o '"commit":"[^"]*"' | cut -d'"' -f4)
  uptime=$(echo $response | grep -o '"uptime":[0-9.]*' | cut -d':' -f2 | cut -d'.' -f1)

  echo "[$i] $(date +%H:%M:%S) - Commit: $commit | Uptime: ${uptime}s"

  if [ "$uptime" -lt "60" ]; then
    echo ""
    echo "✅ NEW DEPLOYMENT DETECTED!"
    echo "Full response:"
    echo $response | python -m json.tool 2>/dev/null || echo $response
    break
  fi

  sleep 10
done
