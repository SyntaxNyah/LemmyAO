import{Nc as f}from"./chunk-rx6sw5jz.js";import"./chunk-ktfc2tac.js";var k="textureAlphaCheckerPixelShader",p=`
var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;varying vUv: vec2f;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=vec4f(
vec3f(1.0)-vec3f(textureSample(textureSampler,textureSamplerSampler,fragmentInputs.vUv).a),
1.0
);}
`;f.ShadersStoreWGSL[k]=p;var u={name:k,shader:p};export{u as TextureAlphaCheckerPixelShader};

//# debugId=7D132892777086BD64756E2164756E21
//# sourceMappingURL=chunk-z43sc5v6.js.map
