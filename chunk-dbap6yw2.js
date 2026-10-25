import{Nc as b}from"./chunk-rx6sw5jz.js";import"./chunk-ktfc2tac.js";var k="passPixelShader",l=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=textureSample(textureSampler,textureSamplerSampler,input.vUV);}`;if(!b.ShadersStoreWGSL[k])b.ShadersStoreWGSL[k]=l;var v={name:k,shader:l};export{v as passPixelShaderWGSL};

//# debugId=1B10B83E63F549DD64756E2164756E21
//# sourceMappingURL=chunk-dbap6yw2.js.map
