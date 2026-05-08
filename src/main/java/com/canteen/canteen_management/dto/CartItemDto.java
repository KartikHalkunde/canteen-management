package com.canteen.canteen_management.dto;

import lombok.Data;

@Data
public class CartItemDto {
    private Long menuItemId;
    private Integer quantity;
}