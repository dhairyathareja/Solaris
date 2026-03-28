varying float vAlpha;

void main() {
  // Soft circular point
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  if(dist > 0.5) discard;
  
  float falloff = smoothstep(0.5, 0.0, dist);
  
  // Mixed gold / orange color
  vec3 color = mix(vec3(1.0, 0.42, 0.0), vec3(1.0, 0.71, 0.0), vAlpha);
  
  gl_FragColor = vec4(color, vAlpha * falloff);
}