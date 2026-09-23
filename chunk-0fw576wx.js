import{da as k}from"./chunk-v8914wh5.js";import{Lc as b}from"./chunk-284eakdn.js";import"./chunk-vth2vbh3.js";var g="rgbdEncodePixelShader",q=`varying vec2 vUV;uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=toRGBD(texture2D(textureSampler,vUV).rgb);}`;if(!b.ShadersStore[g])b.ShadersStore[g]=q;var v=[k];for(let f of v)if(!b.IncludesShadersStore[f.name])b.IncludesShadersStore[f.name]=f.shader;var y={name:g,shader:q};export{y as rgbdEncodePixelShader};

//# debugId=28FAF982D4B181FE64756E2164756E21
//# sourceMappingURL=chunk-0fw576wx.js.map
