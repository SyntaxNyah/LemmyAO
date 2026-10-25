import{ea as k}from"./chunk-p65hndc0.js";import{Nc as b}from"./chunk-rx6sw5jz.js";import"./chunk-ktfc2tac.js";var g="rgbdEncodePixelShader",q=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=toRGBD(textureSample(textureSampler,textureSamplerSampler,input.vUV).rgb);}`;if(!b.ShadersStoreWGSL[g])b.ShadersStoreWGSL[g]=q;var v=[k];for(let f of v)if(!b.IncludesShadersStoreWGSL[f.name])b.IncludesShadersStoreWGSL[f.name]=f.shader;var y={name:g,shader:q};export{y as rgbdEncodePixelShaderWGSL};

//# debugId=75353A71D595252D64756E2164756E21
//# sourceMappingURL=chunk-thrspk5p.js.map
