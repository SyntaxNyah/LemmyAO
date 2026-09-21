import{Oc as f}from"./chunk-cf2anp2z.js";import"./chunk-9cv6hrcp.js";var k="textureAlphaCheckerPixelShader",p=`
var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;varying vUv: vec2f;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=vec4f(
vec3f(1.0)-vec3f(textureSample(textureSampler,textureSamplerSampler,fragmentInputs.vUv).a),
1.0
);}
`;f.ShadersStoreWGSL[k]=p;var u={name:k,shader:p};export{u as TextureAlphaCheckerPixelShader};

//# debugId=3555FDEF8E1709DF64756E2164756E21
//# sourceMappingURL=chunk-fh15twct.js.map
