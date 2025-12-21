#!/bin/bash

# 快速Git提交脚本
# 使用方法: ./quick-commit.sh "提交信息"

# 检查是否提供了提交信息
if [ -z "$1" ]; then
    echo "❌ 请提供提交信息"
    echo "使用方法: ./quick-commit.sh \"你的提交信息\""
    exit 1
fi

echo "🚀 开始快速提交..."

# 添加所有更改
echo "📁 添加所有更改..."
git add .

# 提交更改
echo "💾 提交更改..."
git commit -m "$1"

# 推送到远程仓库
echo "☁️ 推送到GitHub..."
git push origin main

echo "✅ 提交完成！"
echo "📝 提交信息: $1"