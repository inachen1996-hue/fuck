#!/bin/bash

# Git助手脚本 - 优化Git工作流
# 作者: Kiro AI Assistant

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 显示帮助信息
show_help() {
    echo -e "${CYAN}🚀 Git助手脚本${NC}"
    echo -e "${YELLOW}使用方法:${NC}"
    echo -e "  ${GREEN}./git-helper.sh quick \"提交信息\"${NC}     - 快速提交并推送"
    echo -e "  ${GREEN}./git-helper.sh status${NC}              - 查看状态"
    echo -e "  ${GREEN}./git-helper.sh sync${NC}                - 同步远程更改"
    echo -e "  ${GREEN}./git-helper.sh clean${NC}               - 清理未跟踪文件"
    echo -e "  ${GREEN}./git-helper.sh undo${NC}                - 撤销最后一次提交"
    echo -e "  ${GREEN}./git-helper.sh log${NC}                 - 查看提交历史"
}

# 快速提交函数
quick_commit() {
    if [ -z "$1" ]; then
        echo -e "${RED}❌ 请提供提交信息${NC}"
        echo -e "${YELLOW}使用方法: ./git-helper.sh quick \"你的提交信息\"${NC}"
        exit 1
    fi

    echo -e "${PURPLE}🚀 开始快速提交...${NC}"
    
    # 显示当前状态
    echo -e "${BLUE}📊 当前状态:${NC}"
    git status --short
    
    # 添加所有更改
    echo -e "${BLUE}📁 添加所有更改...${NC}"
    git add .
    
    # 提交更改
    echo -e "${BLUE}💾 提交更改...${NC}"
    git commit -m "$1"
    
    if [ $? -eq 0 ]; then
        # 推送到远程仓库
        echo -e "${BLUE}☁️ 推送到GitHub...${NC}"
        git push origin main
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ 提交完成！${NC}"
            echo -e "${GREEN}📝 提交信息: $1${NC}"
        else
            echo -e "${RED}❌ 推送失败${NC}"
            exit 1
        fi
    else
        echo -e "${RED}❌ 提交失败${NC}"
        exit 1
    fi
}

# 查看状态
show_status() {
    echo -e "${CYAN}📊 Git状态:${NC}"
    git status
    echo -e "\n${CYAN}📈 最近提交:${NC}"
    git log --oneline -5
}

# 同步远程更改
sync_remote() {
    echo -e "${BLUE}🔄 同步远程更改...${NC}"
    git fetch origin
    git pull origin main
    echo -e "${GREEN}✅ 同步完成${NC}"
}

# 清理未跟踪文件
clean_untracked() {
    echo -e "${YELLOW}🧹 清理未跟踪文件...${NC}"
    git clean -fd
    echo -e "${GREEN}✅ 清理完成${NC}"
}

# 撤销最后一次提交
undo_commit() {
    echo -e "${YELLOW}⚠️ 撤销最后一次提交...${NC}"
    git reset --soft HEAD~1
    echo -e "${GREEN}✅ 撤销完成${NC}"
}

# 查看提交历史
show_log() {
    echo -e "${CYAN}📜 提交历史:${NC}"
    git log --oneline --graph --decorate -10
}

# 主逻辑
case "$1" in
    "quick")
        quick_commit "$2"
        ;;
    "status")
        show_status
        ;;
    "sync")
        sync_remote
        ;;
    "clean")
        clean_untracked
        ;;
    "undo")
        undo_commit
        ;;
    "log")
        show_log
        ;;
    *)
        show_help
        ;;
esac