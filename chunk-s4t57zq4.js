import{Oc as f}from"./chunk-cf2anp2z.js";import"./chunk-9cv6hrcp.js";var k="textureAlphaCheckerVertexShader",p=`
attribute uv: vec2f;varying vUv: vec2f;@vertex
fn main(input: VertexInputs)->FragmentInputs {vertexOutputs.vUv=vertexInputs.uv;vertexOutputs.position=vec4f(
(vertexInputs.uv % 1.0)*2.0-1.0,
0.0,
1.0
);}
`;f.ShadersStoreWGSL[k]=p;var u={name:k,shader:p};export{u as TextureAlphaCheckerVertexShader};

//# debugId=6DF75D0F9ABC128064756E2164756E21
//# sourceMappingURL=chunk-s4t57zq4.js.map
