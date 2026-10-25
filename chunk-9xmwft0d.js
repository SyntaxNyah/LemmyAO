import{ea as k}from"./chunk-p65hndc0.js";import{Nc as b}from"./chunk-rx6sw5jz.js";import"./chunk-ktfc2tac.js";var g="rgbdDecodePixelShader",q=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=vec4f(fromRGBD(textureSample(textureSampler,textureSamplerSampler,input.vUV)),1.0);}`;if(!b.ShadersStoreWGSL[g])b.ShadersStoreWGSL[g]=q;var v=[k];for(let f of v)if(!b.IncludesShadersStoreWGSL[f.name])b.IncludesShadersStoreWGSL[f.name]=f.shader;var y={name:g,shader:q};export{y as rgbdDecodePixelShaderWGSL};

//# debugId=6E3D43A21FB3721564756E2164756E21
//# sourceMappingURL=chunk-9xmwft0d.js.map
