import{Nc as f}from"./chunk-rx6sw5jz.js";import"./chunk-ktfc2tac.js";var k="textureAlphaCheckerVertexShader",p=`
attribute uv: vec2f;varying vUv: vec2f;@vertex
fn main(input: VertexInputs)->FragmentInputs {vertexOutputs.vUv=vertexInputs.uv;vertexOutputs.position=vec4f(
(vertexInputs.uv % 1.0)*2.0-1.0,
0.0,
1.0
);}
`;f.ShadersStoreWGSL[k]=p;var u={name:k,shader:p};export{u as TextureAlphaCheckerVertexShader};

//# debugId=38B7D54E11047D2D64756E2164756E21
//# sourceMappingURL=chunk-k0rz42x9.js.map
