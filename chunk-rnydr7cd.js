import{Lc as f}from"./chunk-284eakdn.js";import"./chunk-vth2vbh3.js";var k="textureAlphaCheckerPixelShader",p=`
var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;varying vUv: vec2f;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=vec4f(
vec3f(1.0)-vec3f(textureSample(textureSampler,textureSamplerSampler,fragmentInputs.vUv).a),
1.0
);}
`;f.ShadersStoreWGSL[k]=p;var u={name:k,shader:p};export{u as TextureAlphaCheckerPixelShader};

//# debugId=2DEFA44889C2188664756E2164756E21
//# sourceMappingURL=chunk-rnydr7cd.js.map
