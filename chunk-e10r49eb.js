import{da as k}from"./chunk-dtqrx1xn.js";import{Nc as b}from"./chunk-rx6sw5jz.js";import"./chunk-ktfc2tac.js";var g="rgbdDecodePixelShader",q=`varying vec2 vUV;uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=vec4(fromRGBD(texture2D(textureSampler,vUV)),1.0);}`;if(!b.ShadersStore[g])b.ShadersStore[g]=q;var v=[k];for(let f of v)if(!b.IncludesShadersStore[f.name])b.IncludesShadersStore[f.name]=f.shader;var y={name:g,shader:q};export{y as rgbdDecodePixelShader};

//# debugId=2EFB08F7AF3040EF64756E2164756E21
//# sourceMappingURL=chunk-e10r49eb.js.map
