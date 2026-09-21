import{$a as k}from"./chunk-nd4z29xm.js";import{Oc as b}from"./chunk-cf2anp2z.js";import"./chunk-9cv6hrcp.js";var g="rgbdEncodePixelShader",q=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=toRGBD(textureSample(textureSampler,textureSamplerSampler,input.vUV).rgb);}`;if(!b.ShadersStoreWGSL[g])b.ShadersStoreWGSL[g]=q;var v=[k];for(let f of v)if(!b.IncludesShadersStoreWGSL[f.name])b.IncludesShadersStoreWGSL[f.name]=f.shader;var y={name:g,shader:q};export{y as rgbdEncodePixelShaderWGSL};

//# debugId=5F9A7D7F4CA160E064756E2164756E21
//# sourceMappingURL=chunk-cvdj1fsk.js.map
