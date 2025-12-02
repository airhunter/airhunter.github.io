---
title: "IXMLDocument的使用"
date: 2007-12-27T08:32:00Z
tags: ["BCB", "编程", "技术", "XML"]
---

最近要和其它厂商的系统互相交换数据。提到要通过XML实现。花了点时间学习了一下，把一些要点记下来，免得浪费今天的劳动成果～有些函数还是没搞明白，但实现目前的需求应该是没问题了。在此感谢令狐虫和猛禽提供滴无私帮助。

1、IXMLDocument包含哪个头文件？
```cpp
#include<XMLDoc.hpp>
```

2、如何创建一个XML对象？

```cpp
//生成一个XMLDocument对象。
//对象生成后不用自己释放。
_di_IXMLDocument X = NewXMLDocument();
AnsiString rootpath = "c:\\\Temp";
X->Active = true;
//添加一个NodeName叫"dir"
_di_IXMLNode ix = X->AddChild("dir");
//添加Node下的一字Attributes为"id"
//Value为"1001"
ix->Attributes["id"] = "1001";
ix->Attributes["name"] = "file1.txt";
ix->Attributes["path"] = "c:\\\temp";
//保存为XML文件。
X->SaveToFile("c:\\\temp\\\files.xml");
```
3、如何创建树状节结？
```cpp
//在上面代码的基础上添加。
//在Node下面添加一个子节点
_di_IXMLNode ix = node->AddChild("file");
ix->Attributes["id"] = "id";
ix->Attributes["name"] = name;
ix->Attributes["path"] = Path;
ix->Attributes["type"] = "type";
```
4、如何读取XML？
```cpp
//取得XML对象
// 同样不用管释放
_di_IXMLDocument xml =LoadXMLDocument("c:\\\temp\\\files.xml");
//取得XML中的元素。
//这个root是啥我也不知道。
//我理解为root是整个XML的根
_di_IXMLNode root = xml->GetDocumentElement();
//得到root的子节点
_di_IXMLNodeList nodelist = root->ChildNodes;
//_di_IXMLNodeList有一个Count属性
for(int i = 0; i < nodelist->Count; i ++)
{
AnsiString str;
//遍历Node
_di_IXMLNode node = nodelist->Nodes[i];
//从属性中取得Attribute
WideString wpath = node->GetAttribute(WideString("path"));
WideString wfile = node->GetAttribute(WideString("name"));
str = wpath + "\\\" \+ wfile;
Memo1->Lines->Add(str);
//下面这段一样
//只是演试一下如何得到一下层
_di_IXMLNodeList childlist = node->GetChildNodes();

for(int j = 0; j <childlist->Count; j++)
{
AnsiString str;
_di_IXMLNode node = childlist->Nodes[j];
WideString wpath = node->GetAttribute(WideString("path"));
WideString wfile = node->GetAttribute(WideString("name"));

str = " " \+ wpath + "\\\" \+ wfile;
Memo1->Lines->Add(str);
}
}
```
5、其它有用的方法
_di_IXMLNode有一个NodeTpye表明这个Node的类型。但不知道在何时使用它。
_di_IXMLNode有一个NodeValue，我猜是用来表明这个NodeValue的类型。但不知道在何时使用它。也不知道怎么用，总是报错。

附一个例子：
```cpp
TForm1 *Form1;

void AddPath(AnsiString Path, _di_IXMLNode node)
{
AnsiString FilePath=Path+"\\\\*.*";
TSearchRec sr;
sr.Name=FilePath;
int done;
done = FindFirst(FilePath,faAnyFile,sr);
AnsiString FileName;
while (!done) {
FileName=Path+"\\\"+sr.Name;
FileSetAttr(FileName,0);
if(sr.Attr & faDirectory&&sr.Name[1]!='.') {
_di_IXMLNode ix = node->AddChild("dir");
ix->Attributes["id"] = "id";
ix->Attributes["name"] = sr.Name;
ix->Attributes["path"] = Path;
AddPath(FileName, ix);
}
else {
_di_IXMLNode ix = node->AddChild("file");
ix->Attributes["id"] = "id";
ix->Attributes["name"] = sr.Name;
ix->Attributes["path"] = Path;
ix->Attributes["type"] = "type";
}
done = FindNext(sr);
}
FindClose(sr);
}
//---------------------------------------------------------------------------
__fastcall TForm1::TForm1(TComponent* Owner)
```
: TForm(Owner)
```cpp
{
_di_IXMLDocument X = NewXMLDocument();
AnsiString rootpath = "c:\\\Temp";
X->Active = true;
_di_IXMLNode ix = X->AddChild("dir");
ix->Attributes["id"] = "";
ix->Attributes["name"] = ExtractFileName(rootpath);
ix->Attributes["path"] = ExtractFilePath(rootpath);
AddPath(rootpath, ix);
X->SaveToFile("c:\\\temp\\\files.xml");
}
//---------------------------------------------------------------------------
void __fastcall TForm1::Button1Click(TObject *Sender)
{
_di_IXMLDocument xml =LoadXMLDocument("c:\\\temp\\\files.xml");
_di_IXMLNode root = xml->GetDocumentElement();

_di_IXMLNodeList nodelist = root->ChildNodes;
for(int i = 0; i <nodelist->>Count; i++)
{
AnsiString str;
_di_IXMLNode node = nodelist->Nodes[i];
WideString wpath = node->GetAttribute(WideString("path"));
WideString wfile = node->GetAttribute(WideString("name"));
str = wpath + "\\\" \+ wfile;
Memo1->Lines->Add(str);
_di_IXMLNodeList childlist = node->GetChildNodes();
for(int j = 0; j <childlist->Count; j++)
{
AnsiString str;
_di_IXMLNode node = childlist->Nodes[j];
WideString wpath = node->GetAttribute(WideString("path"));
WideString wfile = node->GetAttribute(WideString("name"));
str = " " \+ wpath + "\\\" \+ wfile;
Memo1->Lines->Add(str);
}
}
}
//---------------------------------------------------------------------------
```
