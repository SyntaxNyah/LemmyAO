import{da as k}from"./chunk-v8914wh5.js";import{Lc as b}from"./chunk-284eakdn.js";import"./chunk-vth2vbh3.js";var g="rgbdDecodePixelShader",q=`varying vec2 vUV;uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=vec4(fromRGBD(texture2D(textureSampler,vUV)),1.0);}`;if(!b.ShadersStore[g])b.ShadersStore[g]=q;var v=[k];for(let f of v)if(!b.IncludesShadersStore[f.name])b.IncludesShadersStore[f.name]=f.shader;var y={name:g,shader:q};export{y as rgbdDecodePixelShader};

//# debugId=0DA533A4D370785D64756E2164756E21
//# sourceMappingURL=chunk-dax0gqqm.js.map
