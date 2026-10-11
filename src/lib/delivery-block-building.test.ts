import { describe, it, expect } from "vitest";
import { deliveryAddressKey, missingSameBuildingOrders, groupStopsByBuilding } from "@/lib/delivery-block-rules";
describe("edificio", () => {
  it("misma dirección distinto apto = mismo edificio", () => {
    expect(deliveryAddressKey({ street: "88-10 Parsons Blvd Apt 4B", zip: "11432" })).toBe(deliveryAddressKey({ street: "88-10 parsons blvd", apt: "2", zip: "11432-1" }));
  });
  it("exige incluir vecinos y los junta", () => {
    const a=[{id:"1",key:"x"},{id:"2",key:"y"},{id:"3",key:"x"},{id:"4",key:"z"}];
    expect(missingSameBuildingOrders([a[0],a[1],a[3]], a)).toEqual(["3"]);
    expect(groupStopsByBuilding(a).map(o=>o.id)).toEqual(["1","3","2","4"]);
  });
});
