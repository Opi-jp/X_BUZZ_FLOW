#!/bin/bash

# \m�\�����
# (��: ./create_log_script.sh "����" "\m��"

# p��ï
if [ $# -lt 2 ]; then
    echo "(��: $0 <����> <\m��>"
    echo "�: $0 'X_BUZZ_FLOW' 'CoT��n�c'"
    exit 1
fi

PROJECT_NAME="$1"
WORK_DESCRIPTION="$2"
DATE=$(date +"%Y-%m-%d")
TIME=$(date +"%H:%M:%S")
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# �ǣ���n\
LOG_DIR="$HOME/work_logs/$PROJECT_NAME"
mkdir -p "$LOG_DIR"

# �ա��
LOG_FILE="$LOG_DIR/${DATE}_work_log.md"
DETAIL_FILE="$LOG_DIR/${TIMESTAMP}_${WORK_DESCRIPTION// /_}.md"

# ���ա��k������
if [ ! -f "$LOG_FILE" ]; then
    cat > "$LOG_FILE" << EOF
# $PROJECT_NAME \m� - $DATE

## \met

EOF
fi

# ��๿���Mg������
cat >> "$LOG_FILE" << EOF
### [$TIME] $WORK_DESCRIPTION
- s0: [${TIMESTAMP}_${WORK_DESCRIPTION// /_}.md](${TIMESTAMP}_${WORK_DESCRIPTION// /_}.md)
- �K: =� 2L-

EOF

# s0�ա��n\
cat > "$DETAIL_FILE" << EOF
# $WORK_DESCRIPTION

**����**: $PROJECT_NAME  
**�B**: $DATE $TIME  
**\m**: $(whoami)  

## ��
$WORK_DESCRIPTION

## ����
- [ ] ���1
- [ ] ���2
- [ ] ���3

## �S��
\`\`\`bash
# ���ɋ
\`\`\`

## OL���L
- 

## �zV
- 

## !n����
- 

## ���
- 

---
*��: $(date)*
EOF

echo " �ա��\W~W_:"
echo "  =� ���: $LOG_FILE"
echo "  =� s0�: $DETAIL_FILE"
echo ""
echo "s0��ǣ�g�M~YK? (y/n)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    # VS CodeL�����U�fD�4
    if command -v code &> /dev/null; then
        code "$DETAIL_FILE"
    # ]��o�թ�Ȩǣ�
    else
        ${EDITOR:-nano} "$DETAIL_FILE"
    fi
fi

# Git���׷��	
if [ -d "$LOG_DIR/.git" ]; then
    cd "$LOG_DIR"
    git add .
    git commit -m "[$PROJECT_NAME] $WORK_DESCRIPTION - $TIME"
    echo " Gitk����W~W_"
fi