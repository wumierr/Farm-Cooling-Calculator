Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
WshShell.Run "_stop.bat", 1, True
MsgBox "Service stopped.", vbInformation, "Cooling Calculator"
