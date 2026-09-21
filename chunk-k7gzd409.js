import{_a as k}from"./chunk-ps5tjgy2.js";import{Oc as b}from"./chunk-cf2anp2z.js";import"./chunk-9cv6hrcp.js";var g="rgbdDecodePixelShader",q=`varying vec2 vUV;uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=vec4(fromRGBD(texture2D(textureSampler,vUV)),1.0);}`;if(!b.ShadersStore[g])b.ShadersStore[g]=q;var v=[k];for(let f of v)if(!b.IncludesShadersStore[f.name])b.IncludesShadersStore[f.name]=f.shader;var y={name:g,shader:q};export{y as rgbdDecodePixelShader};

//# debugId=A2BED2BC8D4D292564756E2164756E21
//# sourceMappingURL=chunk-k7gzd409.js.map
