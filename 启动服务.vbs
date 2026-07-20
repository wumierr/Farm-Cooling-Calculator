Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
' _start.bat keeps running as server host — minimize it so it stays out of the way
WshShell.Run "_start.bat", 7, False
