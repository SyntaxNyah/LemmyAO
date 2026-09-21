import{$a as k}from"./chunk-nd4z29xm.js";import{Oc as b}from"./chunk-cf2anp2z.js";import"./chunk-9cv6hrcp.js";var g="rgbdDecodePixelShader",q=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=vec4f(fromRGBD(textureSample(textureSampler,textureSamplerSampler,input.vUV)),1.0);}`;if(!b.ShadersStoreWGSL[g])b.ShadersStoreWGSL[g]=q;var v=[k];for(let f of v)if(!b.IncludesShadersStoreWGSL[f.name])b.IncludesShadersStoreWGSL[f.name]=f.shader;var y={name:g,shader:q};export{y as rgbdDecodePixelShaderWGSL};

//# debugId=A06E5DF1D7B5D0EE64756E2164756E21
//# sourceMappingURL=chunk-g020sh2k.js.map
