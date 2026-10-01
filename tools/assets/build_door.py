# Usage: python3 tools/assets/build_door.py /path/to/kenney_furniture-kit.zip
from pathlib import Path
import zipfile,json,struct,math,zlib,hashlib,sys
p=Path(__file__).resolve().parents[2]
a=p/'public/models/kenney-door';a.mkdir(exist_ok=True)
z=zipfile.ZipFile(sys.argv[1]);src=z.read('Models/GLTF format/doorway.glb');n=struct.unpack_from('<I',src,12)[0];j=json.loads(src[20:20+n]);b=bytearray(src[28+n:]);
# Preserve geometry; give timber planar UVs and a subtle seamless oak grain.
for mesh in j['meshes']:
 for prim in mesh['primitives'][:1]:
  acc=j['accessors'][prim['attributes']['POSITION']];uv=j['accessors'][prim['attributes']['TEXCOORD_0']];posview=j['bufferViews'][acc['bufferView']];uvview=j['bufferViews'][uv['bufferView']]
  for i in range(acc['count']):
   x,y,zz=struct.unpack_from('<fff',b,posview['byteOffset']+i*12)
   struct.pack_into('<ff',b,uvview['byteOffset']+i*8,x*2,y)
w=h=256;raw=bytearray()
for y in range(h):
 raw.append(0)
 for x in range(w):
  wave=math.sin(2*math.pi*y/h)*1.8+math.sin(4*math.pi*y/h)*.4
  grain=math.sin((x+wave)*2*math.pi/16)*3+math.sin((x+wave*.5)*2*math.pi/4)*1.3
  broad=math.sin(x*2*math.pi/64)*2
  raw.extend([int(c+grain+broad) for c in (193,155,111)])
def chunk(t,d):return struct.pack('>I',len(d))+t+d+struct.pack('>I',zlib.crc32(t+d)&0xffffffff)
png=b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(bytes(raw),9))+chunk(b'IEND',b'')
while len(b)%4:b.append(0)
j['bufferViews'].append({'buffer':0,'byteOffset':len(b),'byteLength':len(png)});b.extend(png)
j['images']=[{'bufferView':len(j['bufferViews'])-1,'mimeType':'image/png'}];j['samplers']=[{'wrapS':10497,'wrapT':10497,'magFilter':9729,'minFilter':9987}];j['textures']=[{'source':0,'sampler':0}]
j['materials'][0]['pbrMetallicRoughness']['baseColorFactor']=[1,1,1,1];j['materials'][0]['pbrMetallicRoughness']['baseColorTexture']={'index':0}
j['materials'][1]['pbrMetallicRoughness']['metallicFactor']=.65;j['materials'][1]['pbrMetallicRoughness']['roughnessFactor']=.35
j.pop('extensionsUsed',None);j['buffers'][0]['byteLength']=len(b)
jb=json.dumps(j,separators=(',',':')).encode();jb+=b' '*((-len(jb))%4);b+=b'\0'*((-len(b))%4)
out=struct.pack('<4sII',b'glTF',2,28+len(jb)+len(b))+struct.pack('<I4s',len(jb),b'JSON')+jb+struct.pack('<I4s',len(b),b'BIN\0')+b
(a/'doorway.glb').write_bytes(out);(a/'License.txt').write_bytes(z.read('License.txt'))
(a/'SOURCE.json').write_text(json.dumps({'source':'https://kenney.nl/assets/furniture-kit','asset':'Furniture Kit 2.0 / doorway','license':'CC0-1.0','attributionRequired':False,'sourceSha256':hashlib.sha256(src).hexdigest(),'modifications':'Original geometry; planar UVs, embedded procedural oak grain (256x256); metallic hardware. Texture authored for this project.','files':{name:hashlib.sha256((a/name).read_bytes()).hexdigest() for name in ['doorway.glb','License.txt']}},ensure_ascii=False,indent=2))
