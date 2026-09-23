import{ea as k}from"./chunk-d8vnnm5b.js";import{Lc as b}from"./chunk-284eakdn.js";import"./chunk-vth2vbh3.js";var g="rgbdEncodePixelShader",q=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=toRGBD(textureSample(textureSampler,textureSamplerSampler,input.vUV).rgb);}`;if(!b.ShadersStoreWGSL[g])b.ShadersStoreWGSL[g]=q;var v=[k];for(let f of v)if(!b.IncludesShadersStoreWGSL[f.name])b.IncludesShadersStoreWGSL[f.name]=f.shader;var y={name:g,shader:q};export{y as rgbdEncodePixelShaderWGSL};

//# debugId=446694A0D9076DFE64756E2164756E21
//# sourceMappingURL=chunk-m7960y45.js.map
