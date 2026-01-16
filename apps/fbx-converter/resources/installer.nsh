; 自定义 NSIS 脚本以优化安装程序界面
; 这里使用 MUI (Modern UI) 的宏来修改颜色和文本

; 设置背景颜色 (Zinc-950 #09090b -> 0x0b0909) 注意 NSIS 颜色是 BGR 格式
!define MUI_BGCOLOR 0x0b0909
!define MUI_TEXTCOLOR 0xe4e4e7

; 修改安装界面的顶部 Header
!macro customHeader
!macroend

; 在欢迎页面增加一些现代感的描述
!define MUI_WELCOMEPAGE_TITLE "欢迎使用 FBX to glTF Library"
!define MUI_WELCOMEPAGE_TEXT "这款工具将帮助你快速完成 FBX 到 glTF/GLB 的专业级转换与优化。\r\n\r\n基于开源生态构建，集成 Draco、Meshopt 与 KTX2 技术。"

; 修改安装过程中的文字颜色
!define MUI_INSTALLPROGRESSBARCOLOR 0x3b82f6 ; 蓝色进度条
