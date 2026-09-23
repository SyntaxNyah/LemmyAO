import{Lc as b}from"./chunk-284eakdn.js";import"./chunk-vth2vbh3.js";var f="postprocessVertexShader",k=`attribute position: vec2<f32>;uniform scale: vec2<f32>;varying vUV: vec2<f32>;const madd=vec2(0.5,0.5);
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
vertexOutputs.vUV=(vertexInputs.position*madd+madd)*uniforms.scale;vertexOutputs.position=vec4(vertexInputs.position,0.0,1.0);
#define CUSTOM_VERTEX_MAIN_END
}
`;if(!b.ShadersStoreWGSL[f])b.ShadersStoreWGSL[f]=k;var q={name:f,shader:k};export{q as postprocessVertexShaderWGSL};

//# debugId=94C45644E2F029F664756E2164756E21
//# sourceMappingURL=chunk-wvarh2ke.js.map
