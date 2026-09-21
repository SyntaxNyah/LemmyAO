import{Oc as b}from"./chunk-cf2anp2z.js";import"./chunk-9cv6hrcp.js";var k="passPixelShader",l=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=textureSample(textureSampler,textureSamplerSampler,input.vUV);}`;if(!b.ShadersStoreWGSL[k])b.ShadersStoreWGSL[k]=l;var v={name:k,shader:l};export{v as passPixelShaderWGSL};

//# debugId=CB3D0AD80B94A34964756E2164756E21
//# sourceMappingURL=chunk-wva9fcp8.js.map
