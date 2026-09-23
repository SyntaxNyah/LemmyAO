import{Lc as b}from"./chunk-284eakdn.js";import"./chunk-vth2vbh3.js";var k="passPixelShader",l=`varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=textureSample(textureSampler,textureSamplerSampler,input.vUV);}`;if(!b.ShadersStoreWGSL[k])b.ShadersStoreWGSL[k]=l;var v={name:k,shader:l};export{v as passPixelShaderWGSL};

//# debugId=0BFF35AE389C31A264756E2164756E21
//# sourceMappingURL=chunk-6fqx9j0v.js.map
