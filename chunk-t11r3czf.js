import{Oc as k}from"./chunk-cf2anp2z.js";import"./chunk-9cv6hrcp.js";var q="lodCubePixelShader",v=`const GammaEncodePowerApprox=1.0/2.2;varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_cube<f32>;uniform lod: f32;uniform gamma: i32;@fragment
fn main(input: FragmentInputs)->FragmentOutputs {let uv=fragmentInputs.vUV*2.0-1.0;
#ifdef POSITIVEX
fragmentOutputs.color=textureSampleLevel(textureSampler,textureSamplerSampler,vec3f(1.001,uv.y,uv.x),uniforms.lod);
#endif
#ifdef NEGATIVEX
fragmentOutputs.color=textureSampleLevel(textureSampler,textureSamplerSampler,vec3f(-1.001,uv.y,uv.x),uniforms.lod);
#endif
#ifdef POSITIVEY
fragmentOutputs.color=textureSampleLevel(textureSampler,textureSamplerSampler,vec3f(uv.y,1.001,uv.x),uniforms.lod);
#endif
#ifdef NEGATIVEY
fragmentOutputs.color=textureSampleLevel(textureSampler,textureSamplerSampler,vec3f(uv.y,-1.001,uv.x),uniforms.lod);
#endif
#ifdef POSITIVEZ
fragmentOutputs.color=textureSampleLevel(textureSampler,textureSamplerSampler,vec3f(uv,1.001),uniforms.lod);
#endif
#ifdef NEGATIVEZ
fragmentOutputs.color=textureSampleLevel(textureSampler,textureSamplerSampler,vec3f(uv,-1.001),uniforms.lod);
#endif
if (uniforms.gamma==0) {fragmentOutputs.color=vec4f(pow(fragmentOutputs.color.rgb,vec3f(GammaEncodePowerApprox)),fragmentOutputs.color.a);}}
`;if(!k.ShadersStoreWGSL[q])k.ShadersStoreWGSL[q]=v;var x={name:q,shader:v};export{x as lodCubePixelShaderWGSL};

//# debugId=78FEC6A41460107864756E2164756E21
//# sourceMappingURL=chunk-t11r3czf.js.map
