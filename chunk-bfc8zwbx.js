import{da as k}from"./chunk-dtqrx1xn.js";import{Nc as b}from"./chunk-rx6sw5jz.js";import"./chunk-ktfc2tac.js";var g="rgbdEncodePixelShader",q=`varying vec2 vUV;uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=toRGBD(texture2D(textureSampler,vUV).rgb);}`;if(!b.ShadersStore[g])b.ShadersStore[g]=q;var v=[k];for(let f of v)if(!b.IncludesShadersStore[f.name])b.IncludesShadersStore[f.name]=f.shader;var y={name:g,shader:q};export{y as rgbdEncodePixelShader};

//# debugId=65B1E5D4564111CD64756E2164756E21
//# sourceMappingURL=chunk-bfc8zwbx.js.map
