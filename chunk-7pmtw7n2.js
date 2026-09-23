import{Lc as f}from"./chunk-284eakdn.js";import"./chunk-vth2vbh3.js";var k="textureAlphaCheckerVertexShader",p=`
attribute uv: vec2f;varying vUv: vec2f;@vertex
fn main(input: VertexInputs)->FragmentInputs {vertexOutputs.vUv=vertexInputs.uv;vertexOutputs.position=vec4f(
(vertexInputs.uv % 1.0)*2.0-1.0,
0.0,
1.0
);}
`;f.ShadersStoreWGSL[k]=p;var u={name:k,shader:p};export{u as TextureAlphaCheckerVertexShader};

//# debugId=F82E55B61CF0377264756E2164756E21
//# sourceMappingURL=chunk-7pmtw7n2.js.map
