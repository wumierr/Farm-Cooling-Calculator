' 双击停止服务（静默）
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.Run "_stop.bat", 0, True
MsgBox "服务已停止", vbInformation, "降温剂计算器"
