import os, json, colorsys
from PIL import Image, ImageOps
R=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def crop169(im):
    w,h=im.size; t=16/9
    if w/h>t: nw=int(h*t); x=(w-nw)//2; im=im.crop((x,0,x+nw,h))
    elif w/h<t: nh=int(w/t); y=(h-nh)//2; im=im.crop((0,y,w,y+nh))
    return im
def color(im):
    s=im.resize((16,9),Image.BOX).convert('RGB')
    px=list(s.getdata())
    # pick pixel with best saturation*value balance, averaged with mean for stability
    mr=sum(p[0] for p in px)/len(px); mg=sum(p[1] for p in px)/len(px); mb=sum(p[2] for p in px)/len(px)
    best=max(px,key=lambda p: colorsys.rgb_to_hsv(p[0]/255,p[1]/255,p[2]/255)[1]*min(1,colorsys.rgb_to_hsv(p[0]/255,p[1]/255,p[2]/255)[2]*1.4))
    r=int(mr*0.5+best[0]*0.5); g=int(mg*0.5+best[1]*0.5); b=int(mb*0.5+best[2]*0.5)
    return '#%02x%02x%02x'%(r,g,b)
items=[]
N=len([n for n in os.listdir(f'{R}/images') if n.startswith('jpg_image')])
for i in range(N):
    im=Image.open(f'{R}/images/jpg_image{i}.jpg').convert('RGB')
    im=crop169(im)
    items.append(color(im))
    for w,q in ((800,80),(400,76)):
        out=f'{R}/media/t{w}/{i}.webp'
        if not os.path.exists(out):
            t=im.resize((w,w*9//16),Image.LANCZOS); t.save(out,'WEBP',quality=q,method=4)
    if i%40==0: print('screens',i,flush=True)
json.dump(items,open(f'{R}/data/colors.json','w'))
open(f'{R}/data/screens.js','w').write('window.SCREENS='+json.dumps({'n':N,'colors':items},separators=(',',':'))+';\n')
for n in os.listdir(f'{R}/jailimages'):
    im=Image.open(f'{R}/jailimages/{n}').convert('RGB'); im=crop169(im)
    if im.width>1600: im=im.resize((1600,900),Image.LANCZOS)
    im.save(f'{R}/media/jail/{n.rsplit(".",1)[0]}.webp','WEBP',quality=82,method=4)
# OG image
im=Image.open(f'{R}/images/jpg_image200.jpg').convert('RGB'); im=ImageOps.fit(im,(1200,630),Image.LANCZOS); im.save(f'{R}/og.jpg','JPEG',quality=82,optimize=True,progressive=True)
print('done')
