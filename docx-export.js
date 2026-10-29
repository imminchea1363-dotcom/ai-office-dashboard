/* Native .docx export in the browser. No remote libraries, network calls, or server uploads. */
(() => {
 'use strict';
 const encode = new TextEncoder();
 const xmlEscape = value => String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;');
 const u16 = value => [value & 255,(value >>> 8) & 255];
 const u32 = value => [value & 255,(value >>> 8) & 255,(value >>> 16) & 255,(value >>> 24) & 255];
 const concat = (...parts) => {
  const length=parts.reduce((sum,part)=>sum+part.length,0), bytes=new Uint8Array(length);
  let at=0;for(const part of parts){bytes.set(part,at);at+=part.length;}return bytes;
 };
 const crc32 = data => {
  let crc=0xffffffff;
  for (const octet of data) {crc ^= octet;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}
  return (crc^0xffffffff)>>>0;
 };
 function zip(entries) {
  const data=[],directory=[];let offset=0;
  for(const [name,text] of entries) {
   const filename=encode.encode(name),contents=encode.encode(text),crc=crc32(contents);
   const local=concat(
    [0x50,0x4b,0x03,0x04],u16(20),u16(0x0800),u16(0),u16(0),u16(0),
    u32(crc),u32(contents.length),u32(contents.length),u16(filename.length),u16(0),filename,contents
   );
   const central=concat(
    [0x50,0x4b,0x01,0x02],u16(20),u16(20),u16(0x0800),u16(0),
    u16(0),u16(0),u32(crc),u32(contents.length),u32(contents.length),u16(filename.length),u16(0),
    u16(0),u16(0),u16(0),u32(0),u32(offset),filename
   );
   data.push(local);directory.push(central);offset+=local.length;
  }
  const centralBytes=concat(...directory);
  const end=concat([0x50,0x4b,0x05,0x06],u16(0),u16(0),u16(entries.length),u16(entries.length),
   u32(centralBytes.length),u32(offset),u16(0));
  return new Blob([...data,centralBytes,end],{
   type:'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
 }
 const clean = line => line.replace(/\*\*([^*]+)\*\*/g,'$1');
 function paragraph(line) {
  const heading=/^(#{1,3})\s+(.+)$/.exec(line);
  const title=heading?clean(heading[2]):clean(line.replace(/^\s*[-*]\s+/,'• '));
  const style=heading?'<w:pPr><w:pStyle w:val="Heading'+heading[1].length+'"/></w:pPr>':'';
  return '<w:p>'+style+'<w:r><w:t xml:space="preserve">'+xmlEscape(title)+'</w:t></w:r></w:p>';
 }
 function create(markdown) {
  const text=String(markdown||'').slice(0,65000);
  const body=text.split(/\r?\n/).map(paragraph).join('');
  const document='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
   '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+
   body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr>'+
   '</w:body></w:document>';
  const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'+
   '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'+
   '<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:eastAsia="Malgun Gothic" w:ascii="Calibri"/><w:sz w:val="21"/></w:rPr></w:style>'+
   [1,2,3].map((n)=>'<w:style w:type="paragraph" w:styleId="Heading'+n+'"><w:name w:val="heading '+n+'"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="240" w:after="100"/></w:pPr><w:rPr><w:b/><w:sz w:val="'+(36-4*n)+'"/></w:rPr></w:style>').join('')+
   '</w:styles>';
  return zip([
   ['[Content_Types].xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'],
   ['_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>'],
   ['word/document.xml',document],
   ['word/styles.xml',styles],
   ['word/_rels/document.xml.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>']
  ]);
 }
 window.DongbaekDocxExport=Object.freeze({create});
})();
