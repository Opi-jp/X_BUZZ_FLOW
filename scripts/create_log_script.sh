#!/bin/bash

# \mí°\¹¯ê×È
# (¹Õ: ./create_log_script.sh "×í¸§¯È" "\m…¹"

# pÁ§Ã¯
if [ $# -lt 2 ]; then
    echo "(¹Õ: $0 <×í¸§¯È> <\m…¹>"
    echo "‹: $0 'X_BUZZ_FLOW' 'CoTŸÅnîc'"
    exit 1
fi

PROJECT_NAME="$1"
WORK_DESCRIPTION="$2"
DATE=$(date +"%Y-%m-%d")
TIME=$(date +"%H:%M:%S")
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# í°Ç£ì¯Èên\
LOG_DIR="$HOME/work_logs/$PROJECT_NAME"
mkdir -p "$LOG_DIR"

# í°Õ¡¤ë
LOG_FILE="$LOG_DIR/${DATE}_work_log.md"
DETAIL_FILE="$LOG_DIR/${TIMESTAMP}_${WORK_DESCRIPTION// /_}.md"

# á¤óí°Õ¡¤ëk¨óÈê’ý 
if [ ! -f "$LOG_FILE" ]; then
    cat > "$LOG_FILE" << EOF
# $PROJECT_NAME \mí° - $DATE

## \met

EOF
fi

# ¿¤à¹¿ó×ØMg¨óÈê’ý 
cat >> "$LOG_FILE" << EOF
### [$TIME] $WORK_DESCRIPTION
- s0: [${TIMESTAMP}_${WORK_DESCRIPTION// /_}.md](${TIMESTAMP}_${WORK_DESCRIPTION// /_}.md)
- ¶K: =á 2L-

EOF

# s0í°Õ¡¤ën\
cat > "$DETAIL_FILE" << EOF
# $WORK_DESCRIPTION

**×í¸§¯È**: $PROJECT_NAME  
**åB**: $DATE $TIME  
**\m**: $(whoami)  

## ‚
$WORK_DESCRIPTION

## Ÿ½…¹
- [ ] ¿¹¯1
- [ ] ¿¹¯2
- [ ] ¿¹¯3

## €Sáâ
\`\`\`bash
# ³ÞóÉ‹
\`\`\`

## OL¹û²L
- 

## ãzV
- 

## !n¹ÆÃ×
- 

## Âêó¯
- 

---
*êÕ: $(date)*
EOF

echo " í°Õ¡¤ë’\W~W_:"
echo "  =Ä á¤óí°: $LOG_FILE"
echo "  =Ë s0í°: $DETAIL_FILE"
echo ""
echo "s0í°’¨Ç£¿g‹M~YK? (y/n)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    # VS CodeL¤ó¹ÈüëUŒfD‹4
    if command -v code &> /dev/null; then
        code "$DETAIL_FILE"
    # ]ŒåoÇÕ©ëÈ¨Ç£¿
    else
        ${EDITOR:-nano} "$DETAIL_FILE"
    fi
fi

# GitþÜª×·çó	
if [ -d "$LOG_DIR/.git" ]; then
    cd "$LOG_DIR"
    git add .
    git commit -m "[$PROJECT_NAME] $WORK_DESCRIPTION - $TIME"
    echo " Gitk³ßÃÈW~W_"
fi