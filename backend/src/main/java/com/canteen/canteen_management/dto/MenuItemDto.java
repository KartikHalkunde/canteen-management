package com.canteen.canteen_management.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class MenuItemDto {
    private Long categoryId;
    private String name;
    private String description;
    private BigDecimal price;
    private Integer prepTimeMinutes;
    private Boolean available;
    private String imageUrl;
}