import{ea as k}from"./chunk-d8vnnm5b.js";import{Lc as b}from"./chunk-284eakdn.js";import"./chunk-vth2vbh3.js";var g="rgbdDecodePixelShader",q=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=vec4f(fromRGBD(textureSample(textureSampler,textureSamplerSampler,input.vUV)),1.0);}`;if(!b.ShadersStoreWGSL[g])b.ShadersStoreWGSL[g]=q;var v=[k];for(let f of v)if(!b.IncludesShadersStoreWGSL[f.name])b.IncludesShadersStoreWGSL[f.name]=f.shader;var y={name:g,shader:q};export{y as rgbdDecodePixelShaderWGSL};

//# debugId=D33C606C969CE89164756E2164756E21
//# sourceMappingURL=chunk-k9d04036.js.map
